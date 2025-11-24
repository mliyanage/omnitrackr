import { S3Client, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import { Knex } from 'knex';
import {
  Watcher,
  SourceConnection,
  WatcherLog,
  PollStatus,
  TriggerType,
  SourceConnectionRepository,
  WatcherRepository,
  WatcherLogRepository,
  MatchRule,
} from '@omnitrackr/shared';

/**
 * Polling result for a single watcher
 */
export interface PollResult {
  watcherId: number;
  success: boolean;
  filesDetected: number;
  filesNew: number;
  filesDuplicate: number;
  objectsScanned: number;
  apiCallsMade: number;
  bytesTransferred: number;
  durationMs: number;
  error?: string;
  detectedFiles?: DetectedFile[];
}

/**
 * Detected file information
 */
export interface DetectedFile {
  fileName: string;
  filePath: string;
  fileSize: number;
  lastModified: Date;
  isNew: boolean;
}

/**
 * Polling Service
 * Executes file checks against source connections
 * Batches watchers by connection for efficiency
 */
export class PollingService {
  private connectionRepo: SourceConnectionRepository;
  private watcherRepo: WatcherRepository;
  private watcherLogRepo: WatcherLogRepository;

  constructor(private db: Knex) {
    this.connectionRepo = new SourceConnectionRepository(db);
    this.watcherRepo = new WatcherRepository(db);
    this.watcherLogRepo = new WatcherLogRepository(db);
  }

  /**
   * Poll a single watcher
   * @param watcher The watcher to poll
   * @param triggeredBy How this poll was triggered
   * @param triggeredByUser Optional user who triggered the poll
   * @returns Poll result with statistics
   */
  async pollWatcher(
    watcher: Watcher,
    triggeredBy: TriggerType = 'scheduled',
    triggeredByUser?: string
  ): Promise<PollResult> {
    const startTime = Date.now();
    const pollStartedAt = new Date();

    // Mark poll as in progress
    await this.watcherRepo.markPollInProgress(watcher.id);

    // Create log entry
    const logEntry = await this.watcherLogRepo.createLogEntry({
      watcher_id: watcher.id,
      source_connection_id: watcher.source_connection_id,
      poll_started_at: pollStartedAt,
      poll_status: 'in_progress' as PollStatus,
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser,
      poll_date: pollStartedAt,
    });

    try {
      // Get connection details
      const connection = await this.connectionRepo.findById(
        watcher.source_connection_id
      );

      if (!connection) {
        throw new Error(
          `Connection ${watcher.source_connection_id} not found`
        );
      }

      // Execute poll based on connection type
      let result: PollResult;
      switch (connection.type) {
        case 'S3':
          result = await this.pollS3(watcher, connection, startTime);
          break;
        case 'SFTP':
        case 'FTP':
        case 'FTPS':
          // TODO: Implement SFTP/FTP polling
          throw new Error(`${connection.type} polling not yet implemented`);
        default:
          throw new Error(`Unsupported connection type: ${connection.type}`);
      }

      // Complete log entry
      await this.watcherLogRepo.completeLogEntry(logEntry.id, {
        poll_completed_at: new Date(),
        poll_duration_ms: result.durationMs,
        poll_status: 'success' as PollStatus,
        objects_scanned: result.objectsScanned,
        files_detected: result.filesDetected,
        files_new: result.filesNew,
        files_duplicate: result.filesDuplicate,
        api_calls_made: result.apiCallsMade,
        bytes_transferred: result.bytesTransferred,
        connection_status_at_poll: connection.connection_status,
      });

      // Update watcher statistics
      await this.watcherRepo.updatePollStatistics(watcher.id, {
        success: true,
        filesDetected: result.filesDetected,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Complete log entry with error
      await this.watcherLogRepo.completeLogEntry(logEntry.id, {
        poll_completed_at: new Date(),
        poll_duration_ms: durationMs,
        poll_status: 'failed' as PollStatus,
        objects_scanned: 0,
        files_detected: 0,
        files_new: 0,
        files_duplicate: 0,
        error_details: { message: errorMessage, stack: (error as Error).stack },
      });

      // Update watcher statistics with failure
      await this.watcherRepo.updatePollStatistics(watcher.id, {
        success: false,
        filesDetected: 0,
      });

      return {
        watcherId: watcher.id,
        success: false,
        filesDetected: 0,
        filesNew: 0,
        filesDuplicate: 0,
        objectsScanned: 0,
        apiCallsMade: 0,
        bytesTransferred: 0,
        durationMs,
        error: errorMessage,
      };
    }
  }

  /**
   * Poll S3 bucket for files
   */
  private async pollS3(
    watcher: Watcher,
    connection: SourceConnection,
    startTime: number
  ): Promise<PollResult> {
    const config = connection.connection_config as any;
    const s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    let objectsScanned = 0;
    let apiCallsMade = 0;
    let bytesTransferred = 0;
    const detectedFiles: DetectedFile[] = [];

    try {
      // List objects in bucket with optional prefix
      const prefix = watcher.file_path_pattern || config.prefix || '';
      let continuationToken: string | undefined;

      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        });

        const response = await s3Client.send(listCommand);
        apiCallsMade++;

        if (response.Contents) {
          objectsScanned += response.Contents.length;

          // Filter objects based on file name pattern
          for (const obj of response.Contents) {
            if (!obj.Key) continue;

            const fileName = obj.Key.split('/').pop() || obj.Key;

            // Check if file matches the watcher's pattern
            if (this.matchesPattern(fileName, watcher)) {
              detectedFiles.push({
                fileName,
                filePath: obj.Key,
                fileSize: obj.Size || 0,
                lastModified: obj.LastModified || new Date(),
                isNew: true, // TODO: Check against inward_files table
              });

              bytesTransferred += obj.Size || 0;
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      // Determine which files are new vs duplicates
      // TODO: Query inward_files table to check for duplicates
      const filesNew = detectedFiles.length;
      const filesDuplicate = 0;

      return {
        watcherId: watcher.id,
        success: true,
        filesDetected: detectedFiles.length,
        filesNew,
        filesDuplicate,
        objectsScanned,
        apiCallsMade,
        bytesTransferred,
        durationMs: Date.now() - startTime,
        detectedFiles,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a filename matches the watcher's pattern
   */
  private matchesPattern(fileName: string, watcher: Watcher): boolean {
    if (!watcher.file_name_pattern) {
      return true; // No pattern means match all
    }

    const pattern = watcher.file_name_pattern;
    const matchRule = watcher.match_rule || 'partial';

    switch (matchRule) {
      case 'exact':
        return fileName === pattern;

      case 'partial':
        return fileName.includes(pattern);

      case 'regex':
        try {
          const regex = new RegExp(pattern);
          return regex.test(fileName);
        } catch (error) {
          console.error(`Invalid regex pattern: ${pattern}`, error);
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Poll multiple watchers that share the same connection
   * This is more efficient than polling each watcher separately
   */
  async pollWatchersBatch(
    watchers: Watcher[],
    triggeredBy: TriggerType = 'scheduled'
  ): Promise<PollResult[]> {
    if (watchers.length === 0) {
      return [];
    }

    // Group by connection
    const watchersByConnection = new Map<number, Watcher[]>();
    for (const watcher of watchers) {
      const connectionId = watcher.source_connection_id;
      if (!watchersByConnection.has(connectionId)) {
        watchersByConnection.set(connectionId, []);
      }
      watchersByConnection.get(connectionId)!.push(watcher);
    }

    // Poll each connection's watchers
    const allResults: PollResult[] = [];

    for (const [connectionId, connectionWatchers] of watchersByConnection) {
      console.log(
        `📦 Polling ${connectionWatchers.length} watchers for connection ${connectionId}`
      );

      // Poll watchers sequentially for now
      // TODO: Could optimize S3 polling to list objects once and match against all patterns
      for (const watcher of connectionWatchers) {
        const result = await this.pollWatcher(watcher, triggeredBy);
        allResults.push(result);
      }
    }

    return allResults;
  }

  /**
   * Get recent poll statistics for a watcher
   */
  async getRecentPollStats(
    watcherId: number,
    limit: number = 10
  ): Promise<WatcherLog[]> {
    return this.watcherLogRepo.findByWatcherId(watcherId, limit);
  }
}

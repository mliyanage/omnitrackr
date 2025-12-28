import {
  WatcherRepository,
  SourceConnectionRepository,
  ScheduleRepository,
  FileTrackingRepository,
  Watcher,
  WatcherWithRelations,
  CreateWatcherRequest,
  UpdateWatcherRequest,
  WatcherStatus,
  DirectionType,
  SourceConnection,
} from '@omnitrackr/shared';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { db } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { PollingService } from '@omnitrackr/worker';

/**
 * Watcher Service
 * Business logic for managing watchers
 */
export class WatcherService {
  private watcherRepo: WatcherRepository;
  private connectionRepo: SourceConnectionRepository;
  private scheduleRepo: ScheduleRepository;
  private fileTrackingRepo: FileTrackingRepository;

  constructor() {
    this.watcherRepo = new WatcherRepository(db);
    this.connectionRepo = new SourceConnectionRepository(db);
    this.scheduleRepo = new ScheduleRepository(db);
    this.fileTrackingRepo = new FileTrackingRepository(db);
  }

  /**
   * Get all watchers with pagination
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    filters?: {
      source_connection_id?: number;
      schedule_id?: number;
      department_code?: string;
      status?: WatcherStatus;
      direction?: DirectionType;
    }
  ) {
    return this.watcherRepo.findWithFilters({
      ...filters,
      page,
      limit,
    });
  }

  /**
   * Get watcher by ID
   */
  async getById(id: number): Promise<Watcher> {
    const watcher = await this.watcherRepo.findById<Watcher>(id);
    if (!watcher || watcher.deleted_at) {
      throw new NotFoundError('Watcher', id);
    }
    return watcher;
  }

  /**
   * Get watcher with relations
   */
  async getWithRelations(id: number): Promise<WatcherWithRelations> {
    const watcher = await this.watcherRepo.findWithRelations(id);
    if (!watcher) {
      throw new NotFoundError('Watcher', id);
    }
    return watcher;
  }

  /**
   * Create watcher
   * If a soft-deleted watcher with the same name exists, restore and update it
   */
  async create(request: CreateWatcherRequest, createdBy?: string): Promise<Watcher> {
    // Validate connection exists
    const connection = await this.connectionRepo.findById(request.source_connection_id);
    if (!connection) {
      throw new ValidationError(`Source connection ${request.source_connection_id} not found`);
    }

    // Validate schedule exists (if provided)
    if (request.schedule_id) {
      const schedule = await this.scheduleRepo.findById(request.schedule_id);
      if (!schedule) {
        throw new ValidationError(`Schedule ${request.schedule_id} not found`);
      }
    }

    // Check if a soft-deleted watcher with this name exists
    const deletedWatcher = await this.watcherRepo.findDeletedByName(request.name);

    if (deletedWatcher) {
      // Restore the soft-deleted watcher and update it with new values
      return this.watcherRepo.restore(deletedWatcher.id, {
        source_connection_id: request.source_connection_id,
        schedule_id: request.schedule_id,
        department_code: request.department_code,
        description: request.description,
        file_name_pattern: request.file_name_pattern,
        file_path_pattern: request.file_path_pattern,
        match_rule: request.match_rule ?? 'partial',
        sla_enabled: request.sla_enabled ?? false,
        sla_threshold_minutes: request.sla_threshold_minutes,
        direction: request.direction ?? 'inward',
        owner_team: request.owner_team,
        status: request.status ?? 'active',
        updated_by: createdBy,
      });
    }

    // No deleted watcher found, create a new one
    return this.watcherRepo.create<Watcher>({
      source_connection_id: request.source_connection_id,
      schedule_id: request.schedule_id,
      department_code: request.department_code,
      name: request.name,
      description: request.description,
      file_name_pattern: request.file_name_pattern,
      file_path_pattern: request.file_path_pattern,
      match_rule: request.match_rule ?? 'partial',
      last_check_status: 'never_run',
      last_files_detected: 0,
      sla_enabled: request.sla_enabled ?? false,
      sla_threshold_minutes: request.sla_threshold_minutes,
      direction: request.direction ?? 'inward',
      owner_team: request.owner_team,
      status: request.status ?? 'active',
      total_files_detected: 0,
      total_polls_succeeded: 0,
      total_polls_failed: 0,
      success_rate: 0,
      created_by: createdBy,
    });
  }

  /**
   * Check if update includes critical fields requiring file_tracking regeneration
   */
  private hasCriticalChanges(
    current: Watcher,
    update: UpdateWatcherRequest
  ): boolean {
    const criticalFields = [
      'schedule_id',
      'file_name_pattern',
      'file_path_pattern',
      'match_rule',
      'sla_enabled',
      'sla_threshold_minutes',
    ] as const;

    return criticalFields.some(field => {
      // Check if field is in update AND different from current
      if (update[field] !== undefined && update[field] !== current[field]) {
        console.log(`   Critical change detected: ${field} changed from ${current[field]} to ${update[field]}`);
        return true;
      }
      return false;
    });
  }

  /**
   * Update watcher
   */
  async update(
    id: number,
    request: UpdateWatcherRequest,
    updatedBy?: string
  ): Promise<Watcher> {
    // Get current watcher state BEFORE update
    const currentWatcher = await this.getById(id);

    // Validate connection if being changed
    if (request.source_connection_id) {
      const connection = await this.connectionRepo.findById(request.source_connection_id);
      if (!connection) {
        throw new ValidationError(`Source connection ${request.source_connection_id} not found`);
      }
    }

    // Validate schedule if being changed
    if (request.schedule_id) {
      const schedule = await this.scheduleRepo.findById(request.schedule_id);
      if (!schedule) {
        throw new ValidationError(`Schedule ${request.schedule_id} not found`);
      }
    }

    // Detect critical field changes
    const requiresRegeneration = this.hasCriticalChanges(currentWatcher, request);

    // Update watcher
    const updatedWatcher = await this.watcherRepo.update<Watcher>(id, {
      ...request,
      updated_by: updatedBy,
    });

    // If critical fields changed, delete future pending records
    if (requiresRegeneration) {
      try {
        const deletedCount = await this.fileTrackingRepo.deleteFuturePendingByWatcher(id);
        console.log(
          `ℹ️  Watcher ${id} config changed. Deleted ${deletedCount} future file_tracking records. ` +
          `Next SLA Monitor cycle will regenerate them.`
        );
      } catch (error) {
        console.error(`⚠️  Failed to delete future file_tracking records for watcher ${id}:`, error);
        // Don't fail the update - SLA Monitor will handle duplicates
      }
    }

    return updatedWatcher;
  }

  /**
   * Delete watcher (soft delete)
   */
  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.watcherRepo.softDelete(id);
  }

  /**
   * Update watcher status
   */
  async updateStatus(id: number, status: WatcherStatus): Promise<Watcher> {
    await this.getById(id);
    await this.watcherRepo.updateStatus(id, status);
    return this.getById(id);
  }

  /**
   * Get active watchers (for polling)
   */
  async getActive(): Promise<Watcher[]> {
    return this.watcherRepo.findActive();
  }

  /**
   * Get watchers by connection
   */
  async getByConnection(connectionId: number): Promise<Watcher[]> {
    return this.watcherRepo.findByConnectionId(connectionId);
  }

  /**
   * Get watchers by department
   */
  async getByDepartment(departmentCode: string): Promise<Watcher[]> {
    return this.watcherRepo.findByDepartment(departmentCode);
  }

  /**
   * Get watchers due for polling
   */
  async getDueForPolling(): Promise<Watcher[]> {
    return this.watcherRepo.findDueForPolling();
  }

  /**
   * List files from source for a watcher
   * Used for manual file override
   */
  async listFiles(watcherId: number): Promise<Array<{
    file_name: string;
    file_path: string;
    file_size: number;
    last_modified: Date;
  }>> {
    const watcher = await this.getById(watcherId);
    const connection = await this.connectionRepo.findById<SourceConnection>(
      watcher.source_connection_id
    );

    if (!connection) {
      throw new NotFoundError('Connection', watcher.source_connection_id);
    }

    // Only S3 is supported for now
    if (connection.type !== 'S3') {
      throw new ValidationError('Only S3 connections are supported for manual file override');
    }

    const config = connection.connection_config as any;
    const s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.access_key_id,
        secretAccessKey: config.secret_access_key,
      },
    });

    const files: Array<{
      file_name: string;
      file_path: string;
      file_size: number;
      last_modified: Date;
    }> = [];

    // List objects in bucket with optional prefix
    let prefix = watcher.file_path_pattern || config.path_prefix || '';
    if (prefix.startsWith('/')) {
      prefix = prefix.substring(1);
    }
    if (prefix && !prefix.endsWith('/')) {
      prefix = prefix + '/';
    }

    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(listCommand);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (!obj.Key) continue;

          const fileName = obj.Key.split('/').pop() || obj.Key;

          // Check if file matches the watcher's pattern
          if (this.matchesPattern(fileName, watcher)) {
            files.push({
              file_name: fileName,
              file_path: obj.Key,
              file_size: obj.Size || 0,
              last_modified: obj.LastModified || new Date(),
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    // Sort by last modified descending (newest first)
    files.sort((a, b) => b.last_modified.getTime() - a.last_modified.getTime());

    return files;
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

      case 'partial': {
        // Wildcard matching
        const regexPattern = pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
          .replace(/\*/g, '.*'); // Convert * to .*
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(fileName);
      }

      case 'regex':
        try {
          const userRegex = new RegExp(pattern);
          return userRegex.test(fileName);
        } catch {
          return false; // Invalid regex
        }

      default:
        return false;
    }
  }

  /**
   * Trigger a manual poll for a watcher
   * This allows on-demand file checking outside of scheduled intervals
   */
  async triggerPoll(watcherId: number): Promise<{
    success: boolean;
    message: string;
    filesDetected?: number;
    filesNew?: number;
  }> {
    // Get watcher by ID
    const watcher = await this.getById(watcherId);

    // Validate watcher is active
    if (watcher.status !== 'active') {
      throw new ValidationError('Cannot poll inactive watcher');
    }

    // Instantiate PollingService and trigger poll
    const pollingService = new PollingService(db);
    const result = await pollingService.pollWatcher(watcher, 'manual');

    // Return result
    return {
      success: result.success,
      message: result.success
        ? `Poll completed. Found ${result.filesDetected} files (${result.filesNew} new)`
        : `Poll failed: ${result.error}`,
      filesDetected: result.filesDetected,
      filesNew: result.filesNew,
    };
  }
}

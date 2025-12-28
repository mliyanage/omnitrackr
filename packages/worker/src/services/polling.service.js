"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollingService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
const shared_1 = require("@omnitrackr/shared");
const sla_monitor_service_1 = require("./sla-monitor.service");
/**
 * Polling Service
 * Executes file checks against source connections
 * Batches watchers by connection for efficiency
 */
class PollingService {
    db;
    connectionRepo;
    watcherRepo;
    watcherLogRepo;
    slaMonitorService;
    constructor(db) {
        this.db = db;
        this.connectionRepo = new shared_1.SourceConnectionRepository(db);
        this.watcherRepo = new shared_1.WatcherRepository(db);
        this.watcherLogRepo = new shared_1.WatcherLogRepository(db);
        this.slaMonitorService = new sla_monitor_service_1.SLAMonitorService(db);
    }
    /**
     * Poll a single watcher
     * @param watcher The watcher to poll
     * @param triggeredBy How this poll was triggered
     * @param triggeredByUser Optional user who triggered the poll
     * @returns Poll result with statistics
     */
    async pollWatcher(watcher, triggeredBy = 'scheduler', triggeredByUser) {
        const startTime = Date.now();
        const pollStartedAt = new Date();
        // Mark poll as in progress (updates watchers.last_check_status)
        await this.watcherRepo.markPollInProgress(watcher.id);
        try {
            // Get connection details
            const connection = await this.connectionRepo.findById(watcher.source_connection_id);
            if (!connection) {
                throw new Error(`Connection ${watcher.source_connection_id} not found`);
            }
            // Get the last check time to determine which files are new
            const lastCheckAt = watcher.last_check_at ? new Date(watcher.last_check_at) : null;
            // Execute poll based on connection type
            let result;
            switch (connection.type) {
                case 'S3':
                    result = await this.pollS3(watcher, connection, startTime, lastCheckAt);
                    break;
                case 'SFTP':
                    result = await this.pollSFTP(watcher, connection, startTime, lastCheckAt);
                    break;
                case 'FTP':
                case 'FTPS':
                    // TODO: Implement FTP/FTPS polling
                    throw new Error(`${connection.type} polling not yet implemented`);
                default:
                    throw new Error(`Unsupported connection type: ${connection.type}`);
            }
            // Create log entry for completed poll
            await this.watcherLogRepo.createLogEntry({
                watcher_id: watcher.id,
                source_connection_id: watcher.source_connection_id,
                poll_started_at: pollStartedAt,
                poll_completed_at: new Date(),
                poll_duration_ms: result.durationMs,
                poll_status: 'success',
                objects_scanned: result.objectsScanned,
                files_detected: result.filesDetected,
                files_new: result.filesNew,
                files_duplicate: result.filesDuplicate,
                api_calls_made: result.apiCallsMade,
                bytes_transferred: result.bytesTransferred,
                connection_status_at_poll: connection.connection_status,
                triggered_by: triggeredBy,
                triggered_by_user: triggeredByUser,
                poll_date: pollStartedAt,
            });
            // Update watcher statistics
            await this.watcherRepo.updatePollStatistics(watcher.id, {
                success: true,
                filesDetected: result.filesDetected,
                filesNew: result.filesNew,
            });
            // Match detected files to SLA file_tracking records if SLA is enabled
            if (watcher.sla_enabled && result.detectedFiles && result.detectedFiles.length > 0) {
                await this.matchFilesToSLATracking(watcher, result.detectedFiles, pollStartedAt);
            }
            return result;
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Create log entry for failed poll
            await this.watcherLogRepo.createLogEntry({
                watcher_id: watcher.id,
                source_connection_id: watcher.source_connection_id,
                poll_started_at: pollStartedAt,
                poll_completed_at: new Date(),
                poll_duration_ms: durationMs,
                poll_status: 'failed',
                objects_scanned: 0,
                files_detected: 0,
                files_new: 0,
                files_duplicate: 0,
                error_details: { message: errorMessage, stack: error.stack },
                triggered_by: triggeredBy,
                triggered_by_user: triggeredByUser,
                poll_date: pollStartedAt,
            });
            // Update watcher statistics with failure
            await this.watcherRepo.updatePollStatistics(watcher.id, {
                success: false,
                filesDetected: 0,
                filesNew: 0,
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
    async pollS3(watcher, connection, startTime, lastCheckAt) {
        const config = connection.connection_config;
        const s3Client = new client_s3_1.S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.access_key_id,
                secretAccessKey: config.secret_access_key,
            },
        });
        let objectsScanned = 0;
        let apiCallsMade = 0;
        let bytesTransferred = 0;
        const detectedFiles = [];
        // List objects in bucket with optional prefix
        // Strip leading slash from path pattern (S3 keys don't start with /)
        let prefix = watcher.file_path_pattern || config.path_prefix || '';
        if (prefix.startsWith('/')) {
            prefix = prefix.substring(1);
        }
        // Ensure prefix ends with / if it's not empty (to match directory contents only)
        if (prefix && !prefix.endsWith('/')) {
            prefix = prefix + '/';
        }
        let continuationToken;
        do {
            const listCommand = new client_s3_1.ListObjectsV2Command({
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
                    if (!obj.Key)
                        continue;
                    const fileName = obj.Key.split('/').pop() || obj.Key;
                    // Check if file matches the watcher's pattern
                    if (this.matchesPattern(fileName, watcher)) {
                        const fileLastModified = obj.LastModified || new Date();
                        // File is "new" if it was modified after the last check
                        // Compare timestamps in UTC to avoid timezone issues
                        const isNew = !lastCheckAt || fileLastModified.getTime() > lastCheckAt.getTime();
                        detectedFiles.push({
                            fileName,
                            filePath: obj.Key,
                            fileSize: obj.Size || 0,
                            lastModified: fileLastModified,
                            isNew,
                        });
                        bytesTransferred += obj.Size || 0;
                    }
                }
            }
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
        // Determine which files are new vs duplicates based on last modified date
        const filesNew = detectedFiles.filter(f => f.isNew).length;
        const filesDuplicate = detectedFiles.filter(f => !f.isNew).length;
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
    }
    /**
     * Poll SFTP server for files
     * Mirrors the S3 polling pattern for consistency
     */
    async pollSFTP(watcher, connection, startTime, lastCheckAt) {
        const config = connection.connection_config;
        // Initialize SFTP client
        const sftp = new ssh2_sftp_client_1.default();
        let objectsScanned = 0;
        let apiCallsMade = 0;
        let bytesTransferred = 0;
        const detectedFiles = [];
        try {
            // Build SFTP connection config
            const connectConfig = {
                host: config.host,
                port: config.port || 22,
                username: config.username,
                readyTimeout: 20000, // 20 second timeout
            };
            // Add authentication credentials
            if (config.privateKey || config.private_key) {
                connectConfig.privateKey = config.privateKey || config.private_key;
                if (config.passphrase) {
                    connectConfig.passphrase = config.passphrase;
                }
            }
            else {
                connectConfig.password = config.password;
            }
            // Connect to SFTP server
            await sftp.connect(connectConfig);
            apiCallsMade++;
            // Determine path to list
            let pathToList = watcher.file_path_pattern || config.path_prefix || config.pathPrefix || '/';
            // Normalize path: ensure leading slash, remove trailing slash
            if (!pathToList.startsWith('/')) {
                pathToList = '/' + pathToList;
            }
            if (pathToList !== '/' && pathToList.endsWith('/')) {
                pathToList = pathToList.slice(0, -1);
            }
            // List files in directory
            const fileList = await sftp.list(pathToList);
            apiCallsMade++;
            // Process each item in the directory
            for (const item of fileList) {
                objectsScanned++;
                // Skip directories - only process files
                if (item.type !== '-') {
                    continue;
                }
                const fileName = item.name;
                // Check if file matches the watcher's pattern
                if (this.matchesPattern(fileName, watcher)) {
                    // Convert modifyTime to Date
                    const fileLastModified = new Date(item.modifyTime);
                    // File is "new" if modified after last check
                    const isNew = !lastCheckAt || fileLastModified.getTime() > lastCheckAt.getTime();
                    // Build full file path
                    const filePath = pathToList === '/'
                        ? `/${fileName}`
                        : `${pathToList}/${fileName}`;
                    detectedFiles.push({
                        fileName,
                        filePath,
                        fileSize: item.size || 0,
                        lastModified: fileLastModified,
                        isNew,
                    });
                    bytesTransferred += item.size || 0;
                }
            }
            // Close SFTP connection
            await sftp.end();
        }
        catch (error) {
            // Ensure connection is closed on error
            try {
                await sftp.end();
            }
            catch (closeError) {
                // Ignore close errors
            }
            // Re-throw for pollWatcher() to handle
            throw error;
        }
        // Calculate new vs duplicate files
        const filesNew = detectedFiles.filter(f => f.isNew).length;
        const filesDuplicate = detectedFiles.filter(f => !f.isNew).length;
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
    }
    /**
     * Check if a filename matches the watcher's pattern
     */
    matchesPattern(fileName, watcher) {
        if (!watcher.file_name_pattern) {
            return true; // No pattern means match all
        }
        const pattern = watcher.file_name_pattern;
        const matchRule = watcher.match_rule || 'partial';
        switch (matchRule) {
            case 'exact':
                return fileName === pattern;
            case 'partial': {
                // Convert wildcard pattern to regex
                // Escape special regex chars except *, then convert * to .*
                const regexPattern = pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
                    .replace(/\*/g, '.*'); // Convert * to .*
                try {
                    const regex = new RegExp(`^${regexPattern}$`);
                    return regex.test(fileName);
                }
                catch (error) {
                    console.error(`Invalid wildcard pattern: ${pattern}`, error);
                    return false;
                }
            }
            case 'regex': {
                try {
                    const regex = new RegExp(pattern);
                    return regex.test(fileName);
                }
                catch (error) {
                    console.error(`Invalid regex pattern: ${pattern}`, error);
                    return false;
                }
            }
            default:
                return false;
        }
    }
    /**
     * Poll multiple watchers that share the same connection
     * This is more efficient than polling each watcher separately
     */
    async pollWatchersBatch(watchers, triggeredBy = 'scheduler') {
        if (watchers.length === 0) {
            return [];
        }
        // Group by connection
        const watchersByConnection = new Map();
        for (const watcher of watchers) {
            const connectionId = watcher.source_connection_id;
            if (!watchersByConnection.has(connectionId)) {
                watchersByConnection.set(connectionId, []);
            }
            watchersByConnection.get(connectionId).push(watcher);
        }
        // Poll each connection's watchers
        const allResults = [];
        for (const [connectionId, connectionWatchers] of watchersByConnection) {
            console.log(`📦 Polling ${connectionWatchers.length} watchers for connection ${connectionId}`);
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
     * Match detected files to SLA file_tracking records
     * This links files found during polling to expected file records created by SLA monitor
     * Only processes new files (not previously seen) to avoid duplicate matching
     */
    async matchFilesToSLATracking(watcher, detectedFiles, _detectedAt) {
        // Filter to only new files
        const newFiles = detectedFiles.filter(f => f.isNew);
        if (newFiles.length === 0) {
            console.log(`   ℹ️  No new files to match to SLA tracking`);
            return;
        }
        console.log(`   🔗 Matching ${newFiles.length} new files to SLA tracking records...`);
        let matchedCount = 0;
        for (const file of newFiles) {
            try {
                // Use file's actual upload/modified time from S3 for accurate SLA tracking
                await this.slaMonitorService.matchDetectedFile(watcher.id, file.fileName, file.filePath, file.fileSize, file.lastModified // Use S3 LastModified time, not poll detection time
                );
                matchedCount++;
            }
            catch (error) {
                console.error(`   ⚠️  Failed to match file ${file.fileName} to SLA tracking:`, error instanceof Error ? error.message : error);
            }
        }
        if (matchedCount > 0) {
            console.log(`   ✅ Matched ${matchedCount}/${newFiles.length} files to SLA tracking records`);
        }
    }
    /**
     * Get recent poll statistics for a watcher
     */
    async getRecentPollStats(watcherId, limit = 10) {
        return this.watcherLogRepo.findByWatcherId(watcherId, limit);
    }
}
exports.PollingService = PollingService;
//# sourceMappingURL=polling.service.js.map
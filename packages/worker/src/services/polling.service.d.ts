import { Knex } from 'knex';
import { Watcher, WatcherLog, TriggerType } from '@omnitrackr/shared';
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
export declare class PollingService {
    private db;
    private connectionRepo;
    private watcherRepo;
    private watcherLogRepo;
    private slaMonitorService;
    constructor(db: Knex);
    /**
     * Poll a single watcher
     * @param watcher The watcher to poll
     * @param triggeredBy How this poll was triggered
     * @param triggeredByUser Optional user who triggered the poll
     * @returns Poll result with statistics
     */
    pollWatcher(watcher: Watcher, triggeredBy?: TriggerType, triggeredByUser?: string): Promise<PollResult>;
    /**
     * Poll S3 bucket for files
     */
    private pollS3;
    /**
     * Poll SFTP server for files
     * Mirrors the S3 polling pattern for consistency
     */
    private pollSFTP;
    /**
     * Check if a filename matches the watcher's pattern
     */
    private matchesPattern;
    /**
     * Poll multiple watchers that share the same connection
     * This is more efficient than polling each watcher separately
     */
    pollWatchersBatch(watchers: Watcher[], triggeredBy?: TriggerType): Promise<PollResult[]>;
    /**
     * Match detected files to SLA file_tracking records
     * This links files found during polling to expected file records created by SLA monitor
     * Only processes new files (not previously seen) to avoid duplicate matching
     */
    private matchFilesToSLATracking;
    /**
     * Get recent poll statistics for a watcher
     */
    getRecentPollStats(watcherId: number, limit?: number): Promise<WatcherLog[]>;
}
//# sourceMappingURL=polling.service.d.ts.map
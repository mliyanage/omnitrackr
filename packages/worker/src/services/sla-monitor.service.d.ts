import { Knex } from 'knex';
import { Watcher, FileTracking, AlertType } from '@omnitrackr/shared';
/**
 * SLA Alert
 */
export interface SLAAlert {
    fileTracking: FileTracking;
    watcher: Watcher;
    alertType: AlertType;
    message: string;
}
/**
 * SLA Monitor Service
 * Creates expected file tracking records and detects missing/late files
 */
export declare class SLAMonitorService {
    private db;
    private watcherRepo;
    private fileTrackingRepo;
    private scheduleRepo;
    private schedulerService;
    constructor(db: Knex);
    /**
     * Create expected file tracking records for all active watchers
     * This should run daily to create expectations for upcoming polls
     * SLA fields are populated only for watchers with sla_enabled = true
     */
    createExpectedFileRecords(lookAheadHours?: number): Promise<number>;
    /**
     * Check for missing and late files
     * Returns alerts that should be triggered (only for SLA-enabled watchers)
     * Updates tracking status to 'missing' for ALL watchers (for visibility)
     */
    checkForMissingFiles(lookBackHours?: number): Promise<SLAAlert[]>;
    /**
     * Match detected files to expected tracking records
     * When a poll detects a file, match it against pending expectations
     * Uses file's actual upload/modified time to determine if it's on time or late
     */
    matchDetectedFile(watcherId: number, fileName: string, filePath: string, fileSize: number, fileUploadedAt: Date): Promise<void>;
    /**
     * Get SLA dashboard summary
     */
    getSLASummary(periodStart: Date, periodEnd: Date): Promise<{
        totalExpected: number;
        arrivedOnTime: number;
        arrivedLate: number;
        missing: number;
        onTimePercentage: number;
    }>;
    /**
     * Get missing file alerts for a specific watcher
     */
    getMissingFileAlerts(watcherId: number, periodStart: Date, periodEnd: Date): Promise<FileTracking[]>;
    /**
     * Clean up old tracking records (retention policy)
     * Remove records older than specified days
     */
    cleanupOldRecords(retentionDays?: number): Promise<number>;
}
//# sourceMappingURL=sla-monitor.service.d.ts.map
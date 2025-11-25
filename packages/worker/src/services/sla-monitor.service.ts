import { Knex } from 'knex';
import { DateTime } from 'luxon';
import {
  Watcher,
  FileTracking,
  TrackingStatus,
  AlertType,
  WatcherRepository,
  FileTrackingRepository,
  ScheduleRepository,
} from '@omnitrackr/shared';
import { SchedulerService } from './scheduler.service';

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
export class SLAMonitorService {
  private watcherRepo: WatcherRepository;
  private fileTrackingRepo: FileTrackingRepository;
  private scheduleRepo: ScheduleRepository;
  private schedulerService: SchedulerService;

  constructor(private db: Knex) {
    this.watcherRepo = new WatcherRepository(db);
    this.fileTrackingRepo = new FileTrackingRepository(db);
    this.scheduleRepo = new ScheduleRepository(db);
    this.schedulerService = new SchedulerService(db);
  }

  /**
   * Create expected file tracking records for watchers with SLA enabled
   * This should run daily to create expectations for upcoming polls
   */
  async createExpectedFileRecords(lookAheadHours: number = 24): Promise<number> {
    const now = new Date();
    const lookAheadUntil = DateTime.fromJSDate(now).plus({ hours: lookAheadHours }).toJSDate();

    // Get all active watchers with SLA enabled
    const watchers = await this.db('watchers')
      .where({ status: 'active', sla_enabled: true, deleted_at: null })
      .whereNotNull('schedule_id');

    let recordsCreated = 0;

    for (const watcher of watchers) {
      try {
        // Get the watcher's schedule
        if (!watcher.schedule_id) continue;

        const schedule = await this.scheduleRepo.findById(watcher.schedule_id) as any;
        if (!schedule) continue;

        // Calculate next expected run time
        const nextRun = await this.schedulerService.calculateNextRunTime(
          schedule,
          now
        );

        if (!nextRun || nextRun > lookAheadUntil) {
          continue;
        }

        // Calculate SLA deadline
        const slaThresholdMinutes = watcher.sla_threshold_minutes || 60;
        const slaDeadline = DateTime.fromJSDate(nextRun)
          .plus({ minutes: slaThresholdMinutes })
          .toJSDate();

        // Check if we already have a tracking record for this expectation
        const existing = await this.db('file_tracking')
          .where({
            watcher_id: watcher.id,
            expected_at: nextRun,
          })
          .first();

        if (existing) {
          continue; // Already created
        }

        // Create tracking record
        await this.fileTrackingRepo.createExpectedFile({
          watcher_id: watcher.id,
          expected_pattern: watcher.file_name_pattern || '*',
          expected_at: nextRun,
          expected_schedule: schedule.name,
          sla_threshold_minutes: slaThresholdMinutes,
          sla_deadline: slaDeadline,
        });

        recordsCreated++;
      } catch (error) {
        console.error(
          `Error creating expected file record for watcher ${watcher.id}:`,
          error
        );
      }
    }

    console.log(`📅 Created ${recordsCreated} expected file tracking records`);
    return recordsCreated;
  }

  /**
   * Check for missing and late files
   * Returns alerts that should be triggered
   */
  async checkForMissingFiles(lookBackHours: number = 24): Promise<SLAAlert[]> {
    const now = new Date();
    const lookBackFrom = DateTime.fromJSDate(now)
      .minus({ hours: lookBackHours })
      .toJSDate();

    const alerts: SLAAlert[] = [];

    // Find file tracking records that are past their SLA deadline
    // and still marked as pending (not arrived)
    const overdueRecords = await this.db('file_tracking')
      .where('sla_deadline', '<', now)
      .where('tracking_status', 'pending')
      .where('expected_at', '>=', lookBackFrom)
      .whereNull('alert_triggered_at');

    for (const record of overdueRecords) {
      try {
        // Get watcher details
        const watcher = await this.watcherRepo.findById(record.watcher_id);
        if (!watcher) continue;

        // Update tracking status to missing
        await this.fileTrackingRepo.markAsMissing(record.id);

        // Create alert
        const alert: any = {
          fileTracking: record,
          watcher,
          alertType: 'sla_breached',
          message: `File matching pattern "${record.expected_pattern}" was expected at ${record.expected_at} but has not arrived. SLA deadline: ${record.sla_deadline}`,
        };

        alerts.push(alert);
      } catch (error) {
        console.error(
          `Error checking file tracking record ${record.id}:`,
          error
        );
      }
    }

    console.log(`🚨 Found ${alerts.length} missing file alerts`);
    return alerts;
  }

  /**
   * Match detected files to expected tracking records
   * When a poll detects a file, match it against pending expectations
   */
  async matchDetectedFile(
    watcherId: number,
    fileName: string,
    filePath: string,
    fileSize: number,
    detectedAt: Date
  ): Promise<void> {
    // Find pending tracking records for this watcher
    const pendingRecords = await this.db('file_tracking')
      .where({ watcher_id: watcherId })
      .whereIn('tracking_status', ['pending'])
      .where('expected_at', '<=', detectedAt)
      .orderBy('expected_at', 'desc');

    if (pendingRecords.length === 0) {
      return; // No expectations to match
    }

    // Match against the most recent pending record
    const record = pendingRecords[0];

    // Check if file arrived on time or late
    const isLate = detectedAt > new Date(record.sla_deadline);
    const status: TrackingStatus = isLate ? 'late' : 'arrived';

    // Update tracking record
    await this.fileTrackingRepo.markAsArrived(record.id, {
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      arrived_at: detectedAt,
      tracking_status: status,
    });

    // If late, trigger alert
    if (isLate) {
      await this.fileTrackingRepo.triggerAlert(record.id, 'sla_breached');
      console.log(
        `⚠️  Late file detected: ${fileName} (expected by ${record.sla_deadline}, arrived at ${detectedAt})`
      );
    } else {
      console.log(
        `✅ File arrived on time: ${fileName} (expected at ${record.expected_at}, arrived at ${detectedAt})`
      );
    }
  }

  /**
   * Get SLA dashboard summary
   */
  async getSLASummary(
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalExpected: number;
    arrivedOnTime: number;
    arrivedLate: number;
    missing: number;
    onTimePercentage: number;
  }> {
    const summary = await this.fileTrackingRepo.getSLASummary(
      periodStart,
      periodEnd
    );

    return summary as any;
  }

  /**
   * Get missing file alerts for a specific watcher
   */
  async getMissingFileAlerts(
    watcherId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<FileTracking[]> {
    return this.fileTrackingRepo.getMissingFileAlerts(
      watcherId,
      periodStart,
      periodEnd
    ) as any;
  }

  /**
   * Clean up old tracking records (retention policy)
   * Remove records older than specified days
   */
  async cleanupOldRecords(retentionDays: number = 90): Promise<number> {
    const cutoffDate = DateTime.now().minus({ days: retentionDays }).toJSDate();

    const deletedCount = await this.db('file_tracking')
      .where('expected_at', '<', cutoffDate)
      .del();

    console.log(
      `🗑️  Cleaned up ${deletedCount} file tracking records older than ${retentionDays} days`
    );

    return deletedCount;
  }
}

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
   * Create expected file tracking records for all active watchers
   * This should run daily to create expectations for upcoming polls
   * SLA fields are populated only for watchers with sla_enabled = true
   */
  async createExpectedFileRecords(lookAheadHours: number = 24): Promise<number> {
    const now = new Date();
    const lookAheadUntil = DateTime.fromJSDate(now).plus({ hours: lookAheadHours }).toJSDate();

    // Get all active watchers (regardless of SLA status)
    const watchers = await this.db('watchers')
      .where({ status: 'active', deleted_at: null })
      .whereNotNull('schedule_id');

    let recordsCreated = 0;

    for (const watcher of watchers) {
      try {
        // Get the watcher's schedule
        if (!watcher.schedule_id) continue;

        const schedule = await this.scheduleRepo.findById(watcher.schedule_id) as any;
        if (!schedule) continue;

        // Calculate SLA threshold only if SLA is enabled
        const slaThresholdMinutes = watcher.sla_enabled ? (watcher.sla_threshold_minutes || 60) : null;

        // Loop to create multiple expected records within lookahead window
        let currentTime = now;
        let recordsCreatedForWatcher = 0;
        const MAX_RECORDS_PER_WATCHER = 200; // Safety limit to prevent infinite loops

        while (recordsCreatedForWatcher < MAX_RECORDS_PER_WATCHER) {
          // Calculate next expected run time from current time
          const nextRun = await this.schedulerService.calculateNextRunTime(
            schedule,
            currentTime
          );

          // Stop if no next run or it's beyond lookahead window
          if (!nextRun || nextRun > lookAheadUntil) {
            break;
          }

          // Normalize the timestamp to avoid duplicate records due to millisecond differences
          // Round to nearest second for consistent duplicate checking
          const normalizedNextRun = new Date(nextRun);
          normalizedNextRun.setMilliseconds(0);

          // Calculate SLA deadline only if SLA is enabled
          const slaDeadline = watcher.sla_enabled && slaThresholdMinutes
            ? DateTime.fromJSDate(normalizedNextRun)
                .plus({ minutes: slaThresholdMinutes })
                .toJSDate()
            : null;

          // Check if we already have a tracking record for this expectation (within 1 minute tolerance)
          const oneMinuteBefore = DateTime.fromJSDate(normalizedNextRun).minus({ minutes: 1 }).toJSDate();
          const oneMinuteAfter = DateTime.fromJSDate(normalizedNextRun).plus({ minutes: 1 }).toJSDate();

          const existing = await this.db('file_tracking')
            .where({ watcher_id: watcher.id })
            .whereBetween('expected_at', [oneMinuteBefore, oneMinuteAfter])
            .first();

          if (!existing) {
            // Create tracking record with conditional SLA fields
            await this.fileTrackingRepo.createExpectedFile({
              watcher_id: watcher.id,
              expected_pattern: watcher.file_name_pattern || '*',
              expected_at: normalizedNextRun,
              expected_schedule: schedule.name,
              sla_threshold_minutes: slaThresholdMinutes,
              sla_deadline: slaDeadline,
            });

            recordsCreated++;
            recordsCreatedForWatcher++;
          }

          // Move current time forward to the next run to calculate subsequent runs
          // Add 1 millisecond to ensure we move past the current nextRun
          currentTime = new Date(nextRun.getTime() + 1);
        }

        // Log warning if safety limit was hit
        if (recordsCreatedForWatcher >= MAX_RECORDS_PER_WATCHER) {
          console.warn(
            `⚠️  Safety limit reached: Created ${MAX_RECORDS_PER_WATCHER} records for watcher ${watcher.id} (${watcher.name}). ` +
            `This may indicate a very high-frequency schedule.`
          );
        }

        // Log records created for this watcher
        if (recordsCreatedForWatcher > 0) {
          console.log(
            `   ✓ Watcher "${watcher.name}" (ID: ${watcher.id}): Created ${recordsCreatedForWatcher} expected records`
          );
        }
      } catch (error) {
        console.error(
          `Error creating expected file record for watcher ${watcher.id}:`,
          error
        );
      }
    }

    console.log(`📅 Created ${recordsCreated} expected file tracking records across ${watchers.length} watchers`);
    return recordsCreated;
  }

  /**
   * Check for missing and late files
   * Returns alerts that should be triggered (only for SLA-enabled watchers)
   * Updates tracking status to 'missing' for ALL watchers (for visibility)
   */
  async checkForMissingFiles(lookBackHours: number = 24): Promise<SLAAlert[]> {
    const now = new Date();
    const lookBackFrom = DateTime.fromJSDate(now)
      .minus({ hours: lookBackHours })
      .toJSDate();

    const alerts: SLAAlert[] = [];

    // Find file tracking records that are past their SLA deadline
    // and still marked as pending (not arrived)
    // Note: sla_deadline will be NULL for non-SLA watchers, so they won't match this query
    const overdueRecords = await this.db('file_tracking')
      .where('sla_deadline', '<', now)
      .where('tracking_status', 'pending')
      .where('expected_at', '>=', lookBackFrom)
      .whereNull('alert_triggered_at')
      .whereNotNull('sla_deadline'); // Only SLA-enabled watchers have sla_deadline

    for (const record of overdueRecords) {
      try {
        // Get watcher details
        const watcher = await this.watcherRepo.findById(record.watcher_id) as any;
        if (!watcher) continue;

        // Update tracking status to missing for ALL records
        await this.fileTrackingRepo.markAsMissing(record.id);

        // Only create alerts for SLA-enabled watchers
        if (watcher.sla_enabled) {
          const alert: any = {
            fileTracking: record,
            watcher,
            alertType: 'sla_breached',
            message: `File matching pattern "${record.expected_pattern}" was expected at ${record.expected_at} but has not arrived. SLA deadline: ${record.sla_deadline}`,
          };

          alerts.push(alert);
        }
      } catch (error) {
        console.error(
          `Error checking file tracking record ${record.id}:`,
          error
        );
      }
    }

    // Also check for non-SLA watchers to mark as missing (no alerts)
    // For non-SLA watchers, consider files missing if they haven't arrived
    // within a reasonable time window (e.g., 2x the poll interval or 1 hour)
    const nonSLAOverdueRecords = await this.db('file_tracking')
      .join('watchers', 'file_tracking.watcher_id', 'watchers.id')
      .where('file_tracking.tracking_status', 'pending')
      .where('file_tracking.expected_at', '>=', lookBackFrom)
      .whereNull('file_tracking.sla_deadline') // Non-SLA watchers
      .where('watchers.status', 'active')
      .select('file_tracking.*');

    let nonSLAMarkedMissing = 0;
    for (const record of nonSLAOverdueRecords) {
      try {
        // For non-SLA watchers, mark as missing if expected time + 1 hour has passed
        const expectedAt = new Date(record.expected_at);
        const missingSinceThreshold = DateTime.fromJSDate(expectedAt).plus({ hours: 1 }).toJSDate();

        if (now > missingSinceThreshold) {
          await this.fileTrackingRepo.markAsMissing(record.id);
          nonSLAMarkedMissing++;
        }
      } catch (error) {
        console.error(
          `Error marking non-SLA file tracking record ${record.id} as missing:`,
          error
        );
      }
    }

    console.log(`🚨 Found ${alerts.length} missing file alerts (SLA-enabled only)`);
    console.log(`📋 Marked ${nonSLAMarkedMissing} non-SLA files as missing (no alerts)`);
    return alerts;
  }

  /**
   * Match detected files to expected tracking records
   * When a poll detects a file, match it against pending expectations
   * Uses file's actual upload/modified time to determine if it's on time or late
   */
  async matchDetectedFile(
    watcherId: number,
    fileName: string,
    filePath: string,
    fileSize: number,
    fileUploadedAt: Date
  ): Promise<void> {
    // Define time window to search for matching expectations
    // Files can arrive early or late, so we check ±2 hours from upload time
    const windowStart = DateTime.fromJSDate(fileUploadedAt).minus({ hours: 2 }).toJSDate();
    const windowEnd = DateTime.fromJSDate(fileUploadedAt).plus({ hours: 2 }).toJSDate();

    // Find pending tracking records for this watcher within the time window
    const pendingRecords = await this.db('file_tracking')
      .where({ watcher_id: watcherId })
      .whereIn('tracking_status', ['pending'])
      .whereBetween('expected_at', [windowStart, windowEnd])
      .orderBy('expected_at', 'asc');

    if (pendingRecords.length === 0) {
      console.log(
        `   ℹ️  No pending expectation found for file ${fileName} (uploaded at ${fileUploadedAt.toISOString()})`
      );
      return; // No expectations to match
    }

    // Find the closest matching record to the file's upload time
    let closestRecord = pendingRecords[0];
    let minTimeDiff = Math.abs(
      new Date(closestRecord.expected_at).getTime() - fileUploadedAt.getTime()
    );

    for (const record of pendingRecords) {
      const timeDiff = Math.abs(
        new Date(record.expected_at).getTime() - fileUploadedAt.getTime()
      );
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestRecord = record;
      }
    }

    // Check if file arrived on time or late based on SLA deadline
    const isLate = fileUploadedAt > new Date(closestRecord.sla_deadline);
    const status: TrackingStatus = isLate ? 'late' : 'arrived';

    // Update tracking record
    await this.fileTrackingRepo.markAsArrived(closestRecord.id, {
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      arrived_at: fileUploadedAt,
      tracking_status: status,
    });

    // If late, trigger alert
    if (isLate) {
      await this.fileTrackingRepo.triggerAlert(closestRecord.id, 'sla_breached');
      console.log(
        `   ⚠️  Late file: ${fileName} (expected by ${closestRecord.sla_deadline}, uploaded at ${fileUploadedAt.toISOString()})`
      );
    } else {
      const arrivedEarly = fileUploadedAt < new Date(closestRecord.expected_at);
      if (arrivedEarly) {
        console.log(
          `   ✅ File arrived early: ${fileName} (expected at ${closestRecord.expected_at}, uploaded at ${fileUploadedAt.toISOString()})`
        );
      } else {
        console.log(
          `   ✅ File arrived on time: ${fileName} (expected at ${closestRecord.expected_at}, uploaded at ${fileUploadedAt.toISOString()})`
        );
      }
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

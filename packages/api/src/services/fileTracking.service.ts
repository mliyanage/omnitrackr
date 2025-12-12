import {
  FileTrackingRepository,
  FileTracking,
  FileTrackingQueryOptions,
  SLADashboardSummary,
  WatcherRepository,
  Watcher,
} from '@omnitrackr/shared';
import { db } from '../config/database';

/**
 * File Tracking Service
 * Business logic for file tracking operations
 */
export class FileTrackingService {
  private fileTrackingRepo: FileTrackingRepository;
  private watcherRepo: WatcherRepository;

  constructor() {
    this.fileTrackingRepo = new FileTrackingRepository(db);
    this.watcherRepo = new WatcherRepository(db);
  }

  /**
   * Get file tracking records with filters and pagination
   */
  async getFileTracking(options: FileTrackingQueryOptions): Promise<{
    data: FileTracking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const result = await this.fileTrackingRepo.findWithOptions(options);

    // Enrich with watcher details
    const enrichedData = await Promise.all(
      result.data.map(async (record) => {
        const watcher = await this.watcherRepo.findById<Watcher>(record.watcher_id);
        return {
          ...record,
          watcher: watcher ? {
            id: watcher.id,
            name: watcher.name,
            department_code: watcher.department_code,
          } : undefined,
        };
      })
    );

    return {
      data: enrichedData,
      pagination: result.pagination,
    };
  }

  /**
   * Get file tracking by ID
   */
  async getFileTrackingById(id: number): Promise<FileTracking | null> {
    const record = await this.fileTrackingRepo.findById<FileTracking>(id);
    if (!record) return null;

    // Enrich with watcher details
    const watcher = await this.watcherRepo.findById<Watcher>(record.watcher_id);
    return {
      ...record,
      watcher: watcher ? {
        id: watcher.id,
        name: watcher.name,
        department_code: watcher.department_code,
        source_connection_id: watcher.source_connection_id,
        schedule_id: watcher.schedule_id,
      } : undefined,
    } as FileTracking;
  }

  /**
   * Get SLA dashboard summary with all filters
   */
  async getSLASummary(options: {
    from_date?: string;
    to_date?: string;
    watcher_id?: number;
    tracking_status?: 'pending' | 'arrived' | 'late' | 'missing';
    alert_triggered?: boolean;
    direction?: 'inward' | 'outward' | 'bidirectional';
  }): Promise<{
    period_start: Date;
    period_end: Date;
    total_expected: number;
    arrived_on_time: number;
    arrived_late: number;
    missing: number;
    pending: number;
    on_time_percentage: number;
    at_risk_count: number;
  }> {
    // Default to last 24 hours if no dates provided
    const periodEnd = options.to_date ? new Date(options.to_date) : new Date();
    const periodStart = options.from_date
      ? new Date(options.from_date)
      : new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);

    // Use the new aggregated stats method
    const stats = await this.fileTrackingRepo.getAggregatedStats({
      expected_from: periodStart,
      expected_to: periodEnd,
      watcher_id: options.watcher_id,
      tracking_status: options.tracking_status,
      alert_triggered: options.alert_triggered,
      direction: options.direction,
    });

    const on_time_percentage =
      stats.total_expected > 0
        ? (stats.arrived_on_time / stats.total_expected) * 100
        : 0;

    return {
      period_start: periodStart,
      period_end: periodEnd,
      ...stats,
      on_time_percentage,
    };
  }

  /**
   * Get missing file alerts
   */
  async getMissingFileAlerts(
    watcherId?: number,
    periodStart?: Date,
    periodEnd?: Date
  ) {
    return this.fileTrackingRepo.getMissingFileAlerts(
      watcherId,
      periodStart,
      periodEnd
    );
  }

  /**
   * Manually mark a file tracking record as arrived
   * Used when automated matching fails and user needs to manually link a file
   */
  async markFileAsArrived(
    trackingId: number,
    fileData: {
      file_path: string;
      file_name: string;
      file_size: number;
      arrived_at: Date;
    }
  ): Promise<FileTracking> {
    // Get the tracking record first to calculate status
    const record = await this.fileTrackingRepo.findById<FileTracking>(trackingId);
    if (!record) {
      throw new Error('File tracking record not found');
    }

    // Determine if file is late
    const isLate = fileData.arrived_at > new Date(record.sla_deadline);
    const status = isLate ? ('late' as const) : ('arrived' as const);

    // Update the record
    await this.fileTrackingRepo.markAsArrived(trackingId, {
      ...fileData,
      tracking_status: status,
    });

    // Return the updated record
    return this.getFileTrackingById(trackingId) as Promise<FileTracking>;
  }
}

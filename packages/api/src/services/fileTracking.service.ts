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
   * Get SLA dashboard summary
   */
  async getSLASummary(
    from_date?: string,
    to_date?: string,
    watcher_id?: number
  ): Promise<SLADashboardSummary> {
    // Default to last 24 hours if no dates provided
    const periodEnd = to_date ? new Date(to_date) : new Date();
    const periodStart = from_date
      ? new Date(from_date)
      : new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);

    return this.fileTrackingRepo.getSLASummary(
      periodStart,
      periodEnd,
      watcher_id
    );
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
}

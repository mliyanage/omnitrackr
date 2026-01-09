import {
  FileTrackingRepository,
  FileTracking,
  FileTrackingQueryOptions,
  SLADashboardSummary,
  WatcherRepository,
  Watcher,
} from '@omnitrackr/shared';
import { db } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ForbiddenError } from '../utils/errors';

/**
 * File Tracking Service
 * Business logic for file tracking operations with tenant isolation
 */
export class FileTrackingService {
  private fileTrackingRepo: FileTrackingRepository;
  private watcherRepo: WatcherRepository;

  constructor() {
    this.fileTrackingRepo = new FileTrackingRepository(db);
    this.watcherRepo = new WatcherRepository(db);
  }

  /**
   * Get accessible watcher IDs for user
   */
  private async getAccessibleWatcherIds(req: AuthenticatedRequest): Promise<number[] | undefined> {
    // Super admin sees all watchers
    if (req.user.role === 'super_admin') {
      return undefined;
    }

    // Get user's accessible department codes
    let accessibleDeptCodes: string[];
    if (req.user.role === 'owner') {
      const departments = await db('departments')
        .where({ organization_id: req.user.organizationId, deleted_at: null })
        .select('code');
      accessibleDeptCodes = departments.map(d => d.code);
    } else {
      const departments = await db('departments')
        .join('user_departments', 'departments.id', 'user_departments.department_id')
        .where({ 'user_departments.user_id': req.user.id, 'departments.deleted_at': null })
        .select('departments.code');
      accessibleDeptCodes = departments.map(d => d.code);
    }

    // Get watchers in accessible departments
    const watchers = await db('watchers')
      .whereIn('department_code', accessibleDeptCodes)
      .where({ deleted_at: null })
      .select('id');

    return watchers.map(w => w.id);
  }

  /**
   * Get file tracking records with filters and pagination (tenant-filtered)
   */
  async getFileTracking(req: AuthenticatedRequest, options: FileTrackingQueryOptions): Promise<{
    data: FileTracking[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // Get accessible watcher IDs
    const watcherIds = await this.getAccessibleWatcherIds(req);

    // Merge watcher filter with user's accessible watchers
    let finalWatcherId: number | number[] | undefined = options.watcher_id;
    if (watcherIds !== undefined) {
      if (options.watcher_id) {
        // Check if requested watcher is accessible
        if (!watcherIds.includes(options.watcher_id)) {
          throw new ForbiddenError('Access denied to requested watcher');
        }
        finalWatcherId = options.watcher_id;
      } else {
        // Filter to accessible watchers only
        finalWatcherId = watcherIds.length > 0 ? watcherIds : [-1]; // Use -1 to match nothing if no accessible watchers
      }
    }

    const result = await this.fileTrackingRepo.findWithOptions({
      ...options,
      watcher_id: Array.isArray(finalWatcherId) ? undefined : finalWatcherId,
      // TODO: Add support for array of watcher_ids in repository if needed
    });

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
   * Get file tracking by ID with authorization check
   */
  async getFileTrackingById(req: AuthenticatedRequest, id: number): Promise<FileTracking | null> {
    const record = await this.fileTrackingRepo.findById<FileTracking>(id);
    if (!record) return null;

    // Check if user has access to this watcher
    const accessibleWatcherIds = await this.getAccessibleWatcherIds(req);
    if (accessibleWatcherIds !== undefined && !accessibleWatcherIds.includes(record.watcher_id)) {
      throw new ForbiddenError('Access denied to this file tracking record');
    }

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
   * Get SLA dashboard summary with all filters (tenant-filtered)
   */
  async getSLASummary(req: AuthenticatedRequest, options: {
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

    // Get accessible watcher IDs
    const accessibleWatcherIds = await this.getAccessibleWatcherIds(req);

    // Check if requested watcher is accessible
    if (options.watcher_id && accessibleWatcherIds !== undefined) {
      if (!accessibleWatcherIds.includes(options.watcher_id)) {
        throw new ForbiddenError('Access denied to requested watcher');
      }
    }

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
   * Get missing file alerts (tenant-filtered)
   */
  async getMissingFileAlerts(
    req: AuthenticatedRequest,
    watcherId?: number,
    periodStart?: Date,
    periodEnd?: Date
  ) {
    // Get accessible watcher IDs
    const accessibleWatcherIds = await this.getAccessibleWatcherIds(req);

    // Check if requested watcher is accessible
    if (watcherId && accessibleWatcherIds !== undefined) {
      if (!accessibleWatcherIds.includes(watcherId)) {
        throw new ForbiddenError('Access denied to requested watcher');
      }
    }

    return this.fileTrackingRepo.getMissingFileAlerts(
      watcherId,
      periodStart,
      periodEnd
    );
  }

  /**
   * Manually mark a file tracking record as arrived with authorization
   * Used when automated matching fails and user needs to manually link a file
   */
  async markFileAsArrived(
    req: AuthenticatedRequest,
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

    // Check if user has access to this watcher
    const accessibleWatcherIds = await this.getAccessibleWatcherIds(req);
    if (accessibleWatcherIds !== undefined && !accessibleWatcherIds.includes(record.watcher_id)) {
      throw new ForbiddenError('Access denied to this file tracking record');
    }

    // Check if user can modify (viewers cannot)
    if (req.user.role === 'viewer') {
      throw new ForbiddenError('Viewers cannot modify file tracking records');
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
    return this.getFileTrackingById(req, trackingId) as Promise<FileTracking>;
  }
}

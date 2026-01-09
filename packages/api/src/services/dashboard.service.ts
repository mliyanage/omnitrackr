import { db } from '../config/database';
import { FileTrackingRepository } from '@omnitrackr/shared';
import { DashboardSummary } from '@omnitrackr/shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Dashboard Service
 * Provides aggregated analytics data for the dashboard with tenant isolation
 */
export class DashboardService {
  private fileTrackingRepo: FileTrackingRepository;

  constructor() {
    this.fileTrackingRepo = new FileTrackingRepository(db);
  }

  /**
   * Get complete dashboard summary with all metrics (tenant-filtered)
   */
  async getDashboardSummary(req: AuthenticatedRequest, options: {
    from_date: string;
    to_date: string;
    department_codes?: string[];
    direction?: 'inward' | 'outward' | 'bidirectional';
    watcher_id?: number;
  }): Promise<DashboardSummary> {
    const fromDate = new Date(options.from_date);
    const toDate = new Date(options.to_date);

    // Apply organization/department filtering
    let filteredDepartmentCodes = options.department_codes;
    if (req.user.role !== 'super_admin') {
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

      // If department_codes are specified, intersect with accessible departments
      if (filteredDepartmentCodes && filteredDepartmentCodes.length > 0) {
        filteredDepartmentCodes = filteredDepartmentCodes.filter(code => accessibleDeptCodes.includes(code));
      } else {
        filteredDepartmentCodes = accessibleDeptCodes;
      }
    }

    // Calculate previous period dates (rolling)
    const periodDuration = toDate.getTime() - fromDate.getTime();
    const previousTo = new Date(fromDate.getTime() - 1); // 1ms before current
    const previousFrom = new Date(previousTo.getTime() - periodDuration);

    const queryOptions = {
      from_date: fromDate,
      to_date: toDate,
      department_codes: filteredDepartmentCodes,
      direction: options.direction,
      watcher_id: options.watcher_id,
    };

    // Fetch all data in parallel
    const [overview, comparison, directionBreakdown, topWatchers, timeSeries] = await Promise.all([
      this.fileTrackingRepo.getAggregatedStats({
        expected_from: fromDate,
        expected_to: toDate,
        department_codes: options.department_codes,
        direction: options.direction,
        watcher_id: options.watcher_id,
      }),
      this.fileTrackingRepo.getPeriodComparison({
        current_from: fromDate,
        current_to: toDate,
        previous_from: previousFrom,
        previous_to: previousTo,
        department_codes: options.department_codes,
        direction: options.direction,
        watcher_id: options.watcher_id,
      }),
      this.fileTrackingRepo.getDirectionCounts(queryOptions),
      this.fileTrackingRepo.getTopWatchersByPeriod({
        ...queryOptions,
        limit: 5,
      }),
      this.fileTrackingRepo.getTimeSeriesStats({
        ...queryOptions,
        bucket_size: 'day',
      }),
    ]);

    return {
      overview: {
        total_expected: overview.total_expected,
        arrived_on_time: overview.arrived_on_time,
        arrived_late: overview.arrived_late,
        missing: overview.missing,
        pending: overview.pending,
        success_rate: (overview.arrived_on_time / Math.max(overview.total_expected, 1)) * 100,
      },
      comparison,
      direction_breakdown: directionBreakdown,
      top_watchers: topWatchers,
      time_series: timeSeries,
    };
  }
}

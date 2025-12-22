import { db } from '../config/database';
import { FileTrackingRepository } from '@omnitrackr/shared';
import { DashboardSummary } from '@omnitrackr/shared';

/**
 * Dashboard Service
 * Provides aggregated analytics data for the dashboard
 */
export class DashboardService {
  private fileTrackingRepo: FileTrackingRepository;

  constructor() {
    this.fileTrackingRepo = new FileTrackingRepository(db);
  }

  /**
   * Get complete dashboard summary with all metrics
   */
  async getDashboardSummary(options: {
    from_date: string;
    to_date: string;
    department_codes?: string[];
    direction?: 'inward' | 'outward' | 'bidirectional';
  }): Promise<DashboardSummary> {
    const fromDate = new Date(options.from_date);
    const toDate = new Date(options.to_date);

    // Calculate previous period dates (rolling)
    const periodDuration = toDate.getTime() - fromDate.getTime();
    const previousTo = new Date(fromDate.getTime() - 1); // 1ms before current
    const previousFrom = new Date(previousTo.getTime() - periodDuration);

    const queryOptions = {
      from_date: fromDate,
      to_date: toDate,
      department_codes: options.department_codes,
      direction: options.direction,
    };

    // Fetch all data in parallel
    const [overview, comparison, directionBreakdown, topWatchers, timeSeries] = await Promise.all([
      this.fileTrackingRepo.getAggregatedStats({
        expected_from: fromDate,
        expected_to: toDate,
        department_codes: options.department_codes,
        direction: options.direction,
      }),
      this.fileTrackingRepo.getPeriodComparison({
        current_from: fromDate,
        current_to: toDate,
        previous_from: previousFrom,
        previous_to: previousTo,
        department_codes: options.department_codes,
        direction: options.direction,
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

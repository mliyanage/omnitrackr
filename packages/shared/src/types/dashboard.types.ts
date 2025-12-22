/**
 * Dashboard Query Options
 * Parameters for filtering dashboard data
 */
export interface DashboardQueryOptions {
  from_date: Date;
  to_date: Date;
  department_codes?: string[];
  direction?: 'inward' | 'outward' | 'bidirectional';
  watcher_id?: number;
}

/**
 * Time Series Data Point
 * Single data point in time-series chart
 */
export interface TimeSeriesDataPoint {
  time_bucket: Date;
  total_expected: number;
  arrived_on_time: number;
  arrived_late: number;
  missing: number;
  pending: number;
}

/**
 * Direction Breakdown
 * File counts grouped by direction with success rates
 */
export interface DirectionBreakdown {
  inward: number;
  inward_success_rate: number;
  outward: number;
  outward_success_rate: number;
  total: number;
}

/**
 * Top Watcher Statistics
 * Performance metrics for a single watcher
 */
export interface TopWatcherStats {
  watcher_id: number;
  watcher_name: string;
  department_code: string | null;
  direction: 'inward' | 'outward' | 'bidirectional';
  total_files: number;
  arrived_on_time: number;
  arrived_late: number;
  missing: number;
  pending: number;
  success_rate: number;
}

/**
 * Period Statistics
 * Aggregated stats for a time period
 */
export interface PeriodStats {
  total_expected: number;
  arrived_on_time: number;
  arrived_late: number;
  missing: number;
  pending: number;
  success_rate: number;
}

/**
 * Period Comparison
 * Comparison between current and previous period
 */
export interface PeriodComparison {
  current: PeriodStats;
  previous: PeriodStats;
  changes: {
    total_expected_change: number;
    success_rate_change: number;
  };
}

/**
 * Dashboard Summary
 * Complete dashboard data structure
 */
export interface DashboardSummary {
  overview: PeriodStats;
  comparison: PeriodComparison;
  direction_breakdown: DirectionBreakdown;
  top_watchers: TopWatcherStats[];
  time_series: TimeSeriesDataPoint[];
}

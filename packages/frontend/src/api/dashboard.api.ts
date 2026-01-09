import apiClient from './client';

export interface DashboardQueryParams {
  from_date: string;
  to_date: string;
  department_codes?: string[];
  direction?: 'inward' | 'outward' | 'bidirectional';
  watcher_id?: number;
}

export interface TimeSeriesDataPoint {
  time_bucket: string;
  total_expected: number;
  arrived_on_time: number;
  arrived_late: number;
  missing: number;
  pending: number;
}

export interface DirectionBreakdown {
  inward: number;
  inward_success_rate: number;
  outward: number;
  outward_success_rate: number;
  total: number;
}

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

export interface PeriodStats {
  total_expected: number;
  arrived_on_time: number;
  arrived_late: number;
  missing: number;
  pending: number;
  success_rate: number;
}

export interface PeriodComparison {
  current: PeriodStats;
  previous: PeriodStats;
  changes: {
    total_expected_change: number;
    success_rate_change: number;
  };
}

export interface DashboardSummary {
  overview: PeriodStats;
  comparison: PeriodComparison;
  direction_breakdown: DirectionBreakdown;
  top_watchers: TopWatcherStats[];
  time_series: TimeSeriesDataPoint[];
}

export const getDashboardSummary = async (
  params: DashboardQueryParams
): Promise<DashboardSummary> => {
  const queryParams = new URLSearchParams({
    from_date: params.from_date,
    to_date: params.to_date,
  });

  if (params.department_codes && params.department_codes.length > 0) {
    queryParams.append('department_codes', params.department_codes.join(','));
  }

  if (params.direction) {
    queryParams.append('direction', params.direction);
  }

  if (params.watcher_id) {
    queryParams.append('watcher_id', params.watcher_id.toString());
  }

  const response = await apiClient.get(
    `/dashboard/summary?${queryParams.toString()}`
  );

  return response.data.data;
};

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { FileVolumeChart } from '@/components/dashboard/FileVolumeChart';
import { DirectionBreakdownCard } from '@/components/dashboard/DirectionBreakdownCard';
import { TopWatchersTable } from '@/components/dashboard/TopWatchersTable';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { DepartmentMultiSelect } from '@/components/dashboard/DepartmentMultiSelect';
import { getDashboardSummary } from '@/api/dashboard.api';
import { getDepartments } from '@/api/refData.api';
import { cn } from '@/lib/utils';

type TimeRangePreset = '24h' | '7d' | '30d' | 'custom';
type DirectionFilter = 'all' | 'inward' | 'outward' | 'bidirectional';

export default function AnalyticsDashboardPage() {
  // Filter state
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>('7d');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');

  // Calculate date range based on preset or custom selection
  const dateRange = useMemo(() => {
    if (timeRangePreset === 'custom' && customDateRange?.from && customDateRange?.to) {
      return {
        from: customDateRange.from.toISOString(),
        to: customDateRange.to.toISOString(),
      };
    }

    const now = new Date();
    let from: Date;

    switch (timeRangePreset) {
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      from: from.toISOString(),
      to: now.toISOString(),
    };
  }, [timeRangePreset, customDateRange]);

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'dashboard-summary',
      dateRange,
      selectedDepartments,
      directionFilter,
    ],
    queryFn: () =>
      getDashboardSummary({
        from_date: dateRange.from,
        to_date: dateRange.to,
        department_codes:
          selectedDepartments.length > 0 && selectedDepartments.length < departments.length
            ? selectedDepartments
            : undefined,
        direction: directionFilter !== 'all' ? directionFilter : undefined,
      }),
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    staleTime: 0,
  });

  const departmentOptions = departments.map((dept) => ({
    code: dept.code,
    name: dept.value1 || dept.code,
  }));

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor file tracking performance and trends across all watchers
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Time Range Presets */}
        <Select
          value={timeRangePreset}
          onValueChange={(v) => setTimeRangePreset(v as TimeRangePreset)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        {timeRangePreset === 'custom' && (
          <DateRangePicker value={customDateRange} onChange={setCustomDateRange} />
        )}

        {/* Department Multi-Select */}
        <DepartmentMultiSelect
          departments={departmentOptions}
          selectedDepartments={selectedDepartments}
          onChange={setSelectedDepartments}
        />

        {/* Direction Filter */}
        <Select
          value={directionFilter}
          onValueChange={(v) => setDirectionFilter(v as DirectionFilter)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="inward">Inward</SelectItem>
            <SelectItem value="outward">Outward</SelectItem>
            <SelectItem value="bidirectional">Bidirectional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Section */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          label="Total Expected"
          value={dashboardData?.overview.total_expected || 0}
          changePercentage={dashboardData?.comparison.changes.total_expected_change}
          isLoading={isLoading}
        />
        <DashboardMetricCard
          label="Success Rate"
          value={dashboardData?.overview.success_rate || 0}
          changePercentage={dashboardData?.comparison.changes.success_rate_change}
          formatType="percentage"
          isLoading={isLoading}
        />
        <DashboardMetricCard
          label="On Time Arrivals"
          value={dashboardData?.overview.arrived_on_time || 0}
          isLoading={isLoading}
        />
        <DashboardMetricCard
          label="SLA Violations"
          value={(dashboardData?.overview.arrived_late || 0) + (dashboardData?.overview.missing || 0)}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FileVolumeChart
            data={dashboardData?.time_series || []}
            isLoading={isLoading}
          />
        </div>
        <div>
          <DirectionBreakdownCard
            data={
              dashboardData?.direction_breakdown || {
                inward: 0,
                inward_success_rate: 0,
                outward: 0,
                outward_success_rate: 0,
                total: 0,
              }
            }
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Top Watchers Section */}
      <TopWatchersTable
        data={dashboardData?.top_watchers || []}
        isLoading={isLoading}
      />
    </div>
  );
}

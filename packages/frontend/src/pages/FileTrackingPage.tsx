import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { FileTrackingTable } from '@/components/file-tracking/FileTrackingTable';
import {
  getFileTracking,
  getSLASummary,
  type FileTracking,
} from '@/api/fileTracking.api';
import { getWatchers } from '@/api/watchers.api';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'arrived' | 'late' | 'missing';
type AlertFilter = 'all' | 'true' | 'false';
type DateRangeFilter = '24h' | '7d' | '30d';

export default function FileTrackingPage() {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [watcherFilter, setWatcherFilter] = useState<string>('all');
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('24h');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate date range - memoized to prevent infinite loops
  const dateRangeValues = useMemo(() => {
    const now = new Date();
    let from: Date;

    switch (dateRange) {
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return {
      from: from.toISOString(),
      to: now.toISOString(),
    };
  }, [dateRange]);

  // Fetch file tracking records
  const {
    data: fileTrackingData,
    isLoading: isLoadingRecords,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: [
      'file-tracking',
      {
        status: statusFilter,
        watcher_id: watcherFilter,
        alert: alertFilter,
        ...dateRangeValues,
      },
    ],
    queryFn: () =>
      getFileTracking({
        tracking_status: statusFilter !== 'all' ? statusFilter : undefined,
        watcher_id: watcherFilter !== 'all' ? Number(watcherFilter) : undefined,
        alert_triggered:
          alertFilter === 'true' ? true : alertFilter === 'false' ? false : undefined,
        expected_from: dateRangeValues.from,
        expected_to: dateRangeValues.to,
        page: 1,
        limit: 100,
      }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch SLA summary
  const { data: slaSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['sla-summary', dateRangeValues],
    queryFn: () =>
      getSLASummary({
        from_date: dateRangeValues.from,
        to_date: dateRangeValues.to,
      }),
    refetchInterval: 30000,
  });

  // Fetch watchers for filter dropdown
  const { data: watchers = [] } = useQuery({
    queryKey: ['watchers'],
    queryFn: () => getWatchers(),
  });

  // Client-side filtering for search
  const filteredRecords = (fileTrackingData?.data || []).filter((record) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      record.expected_pattern?.toLowerCase().includes(query) ||
      record.file_name?.toLowerCase().includes(query) ||
      record.watcher?.name?.toLowerCase().includes(query)
    );
  });

  const handleRefresh = () => {
    refetchRecords();
  };

  // Calculate on-time percentage color
  const getOnTimeColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Tracking</h1>
          <p className="text-muted-foreground">
            Monitor file arrivals and track SLA compliance across all watchers
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoadingRecords}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isLoadingRecords && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary Metrics Section */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* Total Expected Card */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Expected</div>
          <div className="text-2xl font-bold mt-2">
            {isLoadingSummary ? '...' : slaSummary?.total_expected || 0}
          </div>
        </Card>

        {/* On-Time Rate Card */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">On-Time Rate</div>
          <div
            className={cn(
              'text-2xl font-bold mt-2',
              !isLoadingSummary && getOnTimeColor(slaSummary?.on_time_percentage || 0)
            )}
          >
            {isLoadingSummary
              ? '...'
              : `${(slaSummary?.on_time_percentage || 0).toFixed(1)}%`}
          </div>
        </Card>

        {/* SLA Violations Card */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">SLA Violations</div>
          <div
            className={cn(
              'text-2xl font-bold mt-2',
              !isLoadingSummary &&
                (slaSummary?.arrived_late || 0) + (slaSummary?.missing || 0) > 0 &&
                'text-red-600'
            )}
          >
            {isLoadingSummary
              ? '...'
              : (slaSummary?.arrived_late || 0) + (slaSummary?.missing || 0)}
          </div>
        </Card>

        {/* At Risk Card */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">At Risk</div>
          <div
            className={cn(
              'text-2xl font-bold mt-2',
              !isLoadingSummary && (slaSummary?.at_risk_count || 0) > 0 && 'text-yellow-600'
            )}
          >
            {isLoadingSummary ? '...' : slaSummary?.at_risk_count || 0}
          </div>
        </Card>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <Input
            placeholder="Search by file pattern, name, or watcher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="arrived">Arrived</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
          </SelectContent>
        </Select>

        {/* Watcher Filter */}
        <Select value={watcherFilter} onValueChange={setWatcherFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Watchers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Watchers</SelectItem>
            {watchers.map((watcher) => (
              <SelectItem key={watcher.id} value={watcher.id.toString()}>
                {watcher.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Alert Filter */}
        <Select value={alertFilter} onValueChange={(v) => setAlertFilter(v as AlertFilter)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Alerts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">With Alerts</SelectItem>
            <SelectItem value="false">Without Alerts</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeFilter)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table Section */}
      <FileTrackingTable records={filteredRecords} isLoading={isLoadingRecords} />
    </div>
  );
}

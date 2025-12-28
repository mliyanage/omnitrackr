import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { FileTrackingTable } from '@/components/file-tracking/FileTrackingTable';
import { FileSelectionSheet } from '@/components/file-tracking/FileSelectionSheet';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import {
  getFileTracking,
  getSLASummary,
  type FileTracking,
} from '@/api/fileTracking.api';
import { getWatchers } from '@/api/watchers.api';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'arrived' | 'late' | 'missing';
type AlertFilter = 'all' | 'true' | 'false';
type DateRangeFilter = '24h' | 'next24h' | '7d' | '30d' | 'custom';
type DirectionFilter = 'all' | 'inward' | 'outward' | 'bidirectional';

export default function FileTrackingPage() {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [watcherFilter, setWatcherFilter] = useState<string>('all');
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('24h');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Refresh trigger to force date recalculation
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // File selection sheet state
  const [isFileSelectionSheetOpen, setIsFileSelectionSheetOpen] = useState(false);
  const [selectedTrackingRecord, setSelectedTrackingRecord] = useState<FileTracking | null>(null);

  // Calculate date range - memoized to prevent infinite loops
  const dateRangeValues = useMemo(() => {
    // Use custom date range if selected and both dates are set
    if (dateRange === 'custom' && customDateRange?.from && customDateRange?.to) {
      return {
        from: customDateRange.from.toISOString(),
        to: customDateRange.to.toISOString(),
      };
    }

    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (dateRange) {
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'next24h':
        // Next 24 hours: from now to 24 hours ahead
        from = now;
        to = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        // If custom is selected but no dates set, default to last 7 days
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }, [dateRange, customDateRange, lastRefreshTime]);

  // Auto-refresh: Update date range every 30 seconds to fetch latest records
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefreshTime(Date.now());
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

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
        direction: directionFilter,
        page: currentPage,
        ...dateRangeValues,
      },
    ],
    queryFn: () =>
      getFileTracking({
        tracking_status: statusFilter !== 'all' ? statusFilter : undefined,
        watcher_id: watcherFilter !== 'all' ? Number(watcherFilter) : undefined,
        alert_triggered:
          alertFilter === 'true' ? true : alertFilter === 'false' ? false : undefined,
        direction: directionFilter !== 'all' ? directionFilter : undefined,
        expected_from: dateRangeValues.from,
        expected_to: dateRangeValues.to,
        page: currentPage,
        limit: 25,
      }),
    staleTime: 0, // Always fetch fresh data, don't use stale cache
    refetchOnMount: true,
  });

  // Fetch SLA summary from backend with all filters for accurate aggregation
  const { data: slaSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: [
      'sla-summary',
      dateRangeValues,
      statusFilter,
      watcherFilter,
      directionFilter,
      alertFilter,
    ],
    queryFn: () =>
      getSLASummary({
        from_date: dateRangeValues.from,
        to_date: dateRangeValues.to,
        watcher_id: watcherFilter !== 'all' ? Number(watcherFilter) : undefined,
        tracking_status: statusFilter !== 'all' ? statusFilter : undefined,
        alert_triggered:
          alertFilter === 'true' ? true : alertFilter === 'false' ? false : undefined,
        direction: directionFilter !== 'all' ? directionFilter : undefined,
      }),
    staleTime: 0,
  });

  // Fetch watchers for filter dropdown
  const { data: watchers = [] } = useQuery({
    queryKey: ['watchers'],
    queryFn: () => getWatchers(),
  });

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, watcherFilter, alertFilter, directionFilter, dateRangeValues, searchQuery]);

  // Use fileTrackingData.data directly (no accumulation needed for traditional pagination)
  const displayedRecords = fileTrackingData?.data || [];

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    if (!fileTrackingData?.pagination) return [];

    const { totalPages } = fileTrackingData.pagination;
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    setLastRefreshTime(Date.now()); // Trigger date range recalculation (auto-refetches via queryKey change)
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkAsArrived = (record: FileTracking) => {
    setSelectedTrackingRecord(record);
    setIsFileSelectionSheetOpen(true);
  };

  const handleFileSelectionSuccess = () => {
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
            {isLoadingSummary || !slaSummary ? '...' : slaSummary.total_expected}
          </div>
        </Card>

        {/* On-Time Rate Card */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">On-Time Rate</div>
          <div
            className={cn(
              'text-2xl font-bold mt-2',
              !isLoadingSummary && slaSummary && getOnTimeColor(slaSummary.on_time_percentage)
            )}
          >
            {isLoadingSummary || !slaSummary
              ? '...'
              : `${slaSummary.on_time_percentage.toFixed(1)}%`}
          </div>
        </Card>

        {/* SLA Violations Card */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">SLA Violations</div>
          <div
            className={cn(
              'text-2xl font-bold mt-2',
              !isLoadingSummary &&
                slaSummary &&
                slaSummary.arrived_late + slaSummary.missing > 0 &&
                'text-red-600'
            )}
          >
            {isLoadingSummary || !slaSummary
              ? '...'
              : slaSummary.arrived_late + slaSummary.missing}
          </div>
        </Card>

        {/* At Risk Card */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">At Risk</div>
          <div
            className={cn(
              'text-2xl font-bold mt-2',
              !isLoadingSummary && slaSummary && slaSummary.at_risk_count > 0 && 'text-yellow-600'
            )}
          >
            {isLoadingSummary || !slaSummary ? '...' : slaSummary.at_risk_count}
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

        {/* Direction Filter */}
        <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as DirectionFilter)}>
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

        {/* Date Range Filter */}
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeFilter)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="next24h">Next 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        {dateRange === 'custom' && (
          <DateRangePicker value={customDateRange} onChange={setCustomDateRange} />
        )}
      </div>

      {/* Table Section */}
      <FileTrackingTable
        records={displayedRecords}
        isLoading={isLoadingRecords}
        onMarkAsArrived={handleMarkAsArrived}
      />

      {/* Pagination Section */}
      {fileTrackingData?.pagination && fileTrackingData.pagination.totalPages > 1 && (
        <div className="flex flex-col items-center gap-4 mt-6">
          {/* Record Count */}
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * fileTrackingData.pagination.limit + 1} to{' '}
            {Math.min(currentPage * fileTrackingData.pagination.limit, fileTrackingData.pagination.total)} of{' '}
            {fileTrackingData.pagination.total} records
            {searchQuery && ` (filtered by search)`}
          </div>

          {/* Pagination Controls */}
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  className={cn(
                    currentPage === 1 && 'pointer-events-none opacity-50',
                    'cursor-pointer'
                  )}
                />
              </PaginationItem>

              {generatePageNumbers().map((page, index) =>
                page === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    currentPage < fileTrackingData.pagination.totalPages &&
                    handlePageChange(currentPage + 1)
                  }
                  className={cn(
                    currentPage === fileTrackingData.pagination.totalPages &&
                      'pointer-events-none opacity-50',
                    'cursor-pointer'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* File Selection Sheet */}
      <FileSelectionSheet
        open={isFileSelectionSheetOpen}
        onOpenChange={setIsFileSelectionSheetOpen}
        trackingRecord={selectedTrackingRecord}
        onSuccess={handleFileSelectionSuccess}
      />
    </div>
  );
}

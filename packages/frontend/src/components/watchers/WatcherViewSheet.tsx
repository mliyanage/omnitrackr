import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getWatcherStatusBadge, getPollStatusBadge } from '@/lib/badgeHelpers';
import type { Watcher } from '@/types';

interface WatcherViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watcher?: Watcher;
}

export function WatcherViewSheet({
  open,
  onOpenChange,
  watcher,
}: WatcherViewSheetProps) {
  if (!watcher) return null;

  const statusBadge = getWatcherStatusBadge(watcher.status);
  const pollStatusBadge = getPollStatusBadge(watcher.last_check_status);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatRelativeTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] z-50" side="right">
        <SheetHeader>
          <SheetTitle>Watcher Details</SheetTitle>
          <SheetDescription>
            View watcher configuration and statistics
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] px-4 mt-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Name</label>
                  <div className="text-sm font-medium mt-1">{watcher.name}</div>
                </div>
                {watcher.description && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Description
                    </label>
                    <div className="text-sm mt-1">{watcher.description}</div>
                  </div>
                )}
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={statusBadge.variant}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Connection & Schedule */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Source Connection
                  </label>
                  <div className="text-sm font-medium mt-1">
                    {watcher.source_connection?.name || `#${watcher.source_connection_id}`}
                  </div>
                  {watcher.source_connection?.type && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {watcher.source_connection.type}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Schedule</label>
                  <div className="text-sm font-medium mt-1">
                    {watcher.schedule?.name || `#${watcher.schedule_id}`}
                  </div>
                  {watcher.schedule?.frequency_type && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {watcher.schedule.frequency_type} (Interval: {watcher.schedule.interval})
                    </div>
                  )}
                </div>
                {watcher.department_code && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Department
                    </label>
                    <div className="text-sm font-medium mt-1">
                      {watcher.department?.value1 || watcher.department_code}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* File Patterns */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">File Pattern Matching</h3>
              <div className="space-y-3">
                {watcher.file_name_pattern && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      File Name Pattern
                    </label>
                    <code className="block text-sm bg-muted px-3 py-2 rounded mt-1">
                      {watcher.file_name_pattern}
                    </code>
                  </div>
                )}
                {watcher.file_path_pattern && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      File Path Pattern
                    </label>
                    <code className="block text-sm bg-muted px-3 py-2 rounded mt-1">
                      {watcher.file_path_pattern}
                    </code>
                  </div>
                )}
                <div>
                  <label className="text-sm text-muted-foreground">Match Rule</label>
                  <div className="text-sm font-medium mt-1 capitalize">
                    {watcher.match_rule}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Direction</label>
                  <div className="text-sm font-medium mt-1 capitalize">
                    {watcher.direction}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* SLA Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">SLA Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    SLA Enabled
                  </label>
                  <div className="mt-1">
                    <Badge variant={watcher.sla_enabled ? 'success' : 'secondary'}>
                      {watcher.sla_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                {watcher.sla_enabled && watcher.sla_threshold_minutes && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      SLA Threshold
                    </label>
                    <div className="text-sm font-medium mt-1">
                      {watcher.sla_threshold_minutes} minutes
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Polling Statistics */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Polling Statistics</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Last Check
                  </label>
                  <div className="text-sm font-medium mt-1">
                    {formatRelativeTime(watcher.last_check_at)}
                  </div>
                  {watcher.last_check_at && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(watcher.last_check_at)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Last Poll Status
                  </label>
                  <div className="mt-1">
                    <Badge variant={pollStatusBadge.variant}>
                      {pollStatusBadge.label}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Total Files Detected
                    </label>
                    <div className="text-2xl font-bold mt-1">
                      {watcher.total_files_detected ?? 0}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Success Rate
                    </label>
                    <div className="text-2xl font-bold mt-1">
                      {Number(watcher.success_rate || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Polls Succeeded
                    </label>
                    <div className="text-lg font-semibold mt-1">
                      {watcher.total_polls_succeeded ?? 0}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Polls Failed
                    </label>
                    <div className="text-lg font-semibold mt-1">
                      {watcher.total_polls_failed ?? 0}
                    </div>
                  </div>
                </div>
                {watcher.last_files_detected !== null && (
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Last Files Detected
                    </label>
                    <div className="text-sm font-medium mt-1">
                      {watcher.last_files_detected}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Audit Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Audit Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Created</label>
                  <div className="text-sm mt-1">{formatDate(watcher.created_at)}</div>
                  {watcher.created_by && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      by {watcher.created_by}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Last Updated
                  </label>
                  <div className="text-sm mt-1">{formatDate(watcher.updated_at)}</div>
                  {watcher.updated_by && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      by {watcher.updated_by}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

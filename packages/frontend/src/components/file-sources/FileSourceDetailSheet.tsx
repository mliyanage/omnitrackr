import { Pencil } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { FileSource } from '@/types';

interface FileSourceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: FileSource | null;
  onEdit?: () => void;
}

export function FileSourceDetailSheet({
  open,
  onOpenChange,
  source,
  onEdit,
}: FileSourceDetailSheetProps) {
  if (!source) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatSourceType = (type: string | undefined) => {
    if (!type) return 'N/A';
    return type.replace(/_/g, ' ');
  };

  const formatStatus = (status: string | undefined, enabled: boolean | undefined) => {
    if (!status) return 'Unknown';
    // Map status values to display text
    if (status === 'active' && enabled) return 'Active';
    if (status === 'disabled' || !enabled) return 'Inactive';
    if (status === 'pending') return 'Pending';
    if (status === 'failed') return 'Failed';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value == null) return 'N/A';
    return value.toLocaleString();
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (ms == null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number | string | null | undefined) => {
    if (value == null) return 'N/A';
    // If it's already a string, parse and format it (API returns "100.00")
    if (typeof value === 'string') {
      return `${parseFloat(value).toFixed(1)}%`;
    }
    // If it's a number less than 1, treat it as a decimal (e.g., 0.95 = 95%)
    if (value < 1) {
      return `${(value * 100).toFixed(1)}%`;
    }
    // Otherwise, it's already a percentage
    return `${value.toFixed(1)}%`;
  };

  const renderConnectionConfig = () => {
    if (!source.connection_config || Object.keys(source.connection_config).length === 0) {
      return <p className="text-sm text-muted-foreground">No configuration details</p>;
    }

    return (
      <div className="space-y-3">
        {Object.entries(source.connection_config).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
            <span className="text-right break-all ml-4 font-medium">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl px-6">
        <SheetHeader className="px-0">
          <SheetTitle>File Source Details</SheetTitle>
          <SheetDescription>{source.name}</SheetDescription>
        </SheetHeader>

        <div className="py-6 px-0">
          <Card>
            {/* Basic Information */}
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{source.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Description</span>
                <span className="text-right ml-4 font-medium">{source.description || 'No description'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{source.department}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline">{formatSourceType(source.type)}</Badge>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Direction</span>
                <Badge variant={source.direction === 'inward' ? 'default' : 'secondary'}>
                  {source.direction}
                </Badge>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={source.status === 'active' && source.enabled ? 'default' : 'secondary'}>
                  {formatStatus(source.status, source.enabled)}
                </Badge>
              </div>
            </CardContent>

            <Separator />

            {/* Connection Details */}
            <CardContent className="space-y-3 pt-6">
              <h3 className="text-sm font-medium">Connection Details</h3>
              {renderConnectionConfig()}
            </CardContent>

            <Separator />

            {/* File Matching */}
            <CardContent className="space-y-3 pt-6">
              <h3 className="text-sm font-medium">File Matching</h3>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">File Name Pattern</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{source.file_name_pattern}</code>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Match Rule</span>
                <Badge variant="outline">{source.match_rule}</Badge>
              </div>
            </CardContent>

            <Separator />

            {/* Scheduling & SLA */}
            <CardContent className="space-y-3 pt-6">
              <h3 className="text-sm font-medium">Scheduling & SLA</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Schedule Time</span>
                <span className="font-medium">{source.schedule}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Timezone</span>
                <span className="font-medium">{source.timezone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SLA Threshold</span>
                <span className="font-medium">{source.sla_threshold} minutes</span>
              </div>
            </CardContent>

            <Separator />

            {/* Performance Metrics */}
            <CardContent className="space-y-3 pt-6">
              <h3 className="text-sm font-medium">Performance Metrics</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-semibold">{formatPercentage(source.success_rate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Files Processed</span>
                <span className="font-medium">{formatNumber(source.files_processed)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Sync</span>
                <span className="font-medium text-xs">
                  {formatDate(source.last_sync || null)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Poll Duration</span>
                <span className="font-medium">{formatDuration(source.last_poll_duration_ms)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Objects Scanned</span>
                <span className="font-medium">{formatNumber(source.last_objects_scanned)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Objects Detected</span>
                <span className="font-medium">{formatNumber(source.last_objects_detected)}</span>
              </div>
            </CardContent>

            <Separator />

            {/* Audit Information */}
            <CardContent className="space-y-3 pt-6">
              <h3 className="text-sm font-medium">Audit Information</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created At</span>
                <span className="font-medium text-xs">
                  {formatDate(source.created_at)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created By</span>
                <span className="font-medium">
                  {source.created_by || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Updated At</span>
                <span className="font-medium text-xs">
                  {formatDate(source.updated_at)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Updated By</span>
                <span className="font-medium">
                  {source.updated_by || 'N/A'}
                </span>
              </div>
            </CardContent>

            <Separator />

            {/* Footer with buttons */}
            <CardContent className="pt-6">
              <div className="flex justify-start gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-auto">
                  Close
                </Button>
                {onEdit && (
                  <Button onClick={onEdit} className="w-auto">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, FileSearch, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FileTracking } from '@/api/fileTracking.api';
import {
  getTrackingStatusBadge,
  getAlertTypeBadge,
} from '@/lib/badgeHelpers';
import {
  formatDateTime,
  formatRelativeTime,
  formatFileSize,
  formatDelay,
  calculateDelay,
  isAtRisk,
  cn,
} from '@/lib/utils';

interface FileTrackingTableProps {
  records: FileTracking[];
  isLoading?: boolean;
  onViewDetails?: (record: FileTracking) => void;
  onMarkAsArrived?: (record: FileTracking) => void;
}

export function FileTrackingTable({
  records,
  isLoading,
  onViewDetails,
  onMarkAsArrived,
}: FileTrackingTableProps) {
  const navigate = useNavigate();

  const handleViewWatcher = (watcherId: number) => {
    navigate(`/watchers/${watcherId}`);
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Watcher</TableHead>
              <TableHead>Expected Pattern</TableHead>
              <TableHead>Expected At</TableHead>
              <TableHead>SLA Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Arrived At</TableHead>
              <TableHead>Delay</TableHead>
              <TableHead>Alert</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                Loading file tracking records...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Watcher</TableHead>
              <TableHead>Expected Pattern</TableHead>
              <TableHead>Expected At</TableHead>
              <TableHead>SLA Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Arrived At</TableHead>
              <TableHead>Delay</TableHead>
              <TableHead>Alert</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                No file tracking records found. Watchers will create tracking records automatically.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Watcher</TableHead>
            <TableHead>Expected Pattern</TableHead>
            <TableHead>Expected At</TableHead>
            <TableHead>SLA Deadline</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>File Name</TableHead>
            <TableHead>Arrived At</TableHead>
            <TableHead>Delay</TableHead>
            <TableHead>Alert</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const badge = getTrackingStatusBadge(record.tracking_status, record.watcher?.sla_enabled);
            const atRisk = isAtRisk(record);

            return (
              <TableRow
                key={record.id}
                className={cn(
                  record.tracking_status === 'missing' &&
                    'bg-red-50 hover:bg-red-100 dark:bg-red-950/20',
                  record.tracking_status === 'late' &&
                    'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20',
                  record.tracking_status === 'arrived' && 'hover:bg-muted/50',
                  record.tracking_status === 'pending' &&
                    atRisk &&
                    'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20'
                )}
              >
                {/* Watcher Column */}
                <TableCell>
                  <div className="font-medium">
                    {record.watcher?.name || `Watcher #${record.watcher_id}`}
                  </div>
                </TableCell>

                {/* Expected Pattern Column */}
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {record.expected_pattern}
                  </code>
                </TableCell>

                {/* Expected At Column */}
                <TableCell>
                  <div className="text-sm">{formatDateTime(record.expected_at)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(record.expected_at)}
                  </div>
                </TableCell>

                {/* SLA Deadline Column */}
                <TableCell>
                  <div className="text-sm">{formatDateTime(record.sla_deadline)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(record.sla_deadline)}
                  </div>
                </TableCell>

                {/* Status Column */}
                <TableCell>
                  <Badge variant={badge.variant as any}>{badge.label}</Badge>
                </TableCell>

                {/* File Name Column */}
                <TableCell>
                  {record.file_name ? (
                    <div>
                      <div className="text-sm font-medium truncate max-w-[200px]">
                        {record.file_name}
                      </div>
                      {record.file_size && (
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(record.file_size)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Arrived At Column */}
                <TableCell>
                  {record.arrived_at ? (
                    <div>
                      <div className="text-sm">{formatDateTime(record.arrived_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(record.arrived_at)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Delay Column */}
                <TableCell>
                  {record.arrived_at && record.expected_at ? (
                    <span
                      className={cn(
                        'text-sm font-medium',
                        calculateDelay(record.arrived_at, record.expected_at) > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      )}
                    >
                      {formatDelay(record.arrived_at, record.expected_at)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Alert Column */}
                <TableCell>
                  {record.alert_triggered && record.alert_type ? (
                    <Badge
                      variant={getAlertTypeBadge(record.alert_type).variant as any}
                      className="text-xs"
                    >
                      {getAlertTypeBadge(record.alert_type).label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Actions Column */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {onViewDetails && (
                        <DropdownMenuItem onClick={() => onViewDetails(record)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      )}
                      {onMarkAsArrived && (record.tracking_status === 'pending' || record.tracking_status === 'missing') && (
                        <DropdownMenuItem onClick={() => onMarkAsArrived(record)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Arrived
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleViewWatcher(record.watcher_id)}>
                        <FileSearch className="mr-2 h-4 w-4" />
                        View Watcher
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

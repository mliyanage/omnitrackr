import { useState } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getEnabledStatusBadge } from '@/lib/badgeHelpers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Schedule, FrequencyType } from '@/types';

interface ScheduleTableProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: number) => void;
  onToggleEnabled: (schedule: Schedule) => void;
  onCalculateNextRun?: (schedule: Schedule) => void;
  isLoading?: boolean;
}

export function ScheduleTable({
  schedules,
  onEdit,
  onDelete,
  onToggleEnabled,
  onCalculateNextRun,
  isLoading = false,
}: ScheduleTableProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const formatFrequency = (schedule: Schedule): string => {
    const { frequency_type, interval } = schedule;

    const typeMap: Record<FrequencyType, string> = {
      minutely: 'minute',
      hourly: 'hour',
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
      yearly: 'year',
    };

    const unit = typeMap[frequency_type] || frequency_type;
    const plural = interval > 1 ? `${unit}s` : unit;

    if (interval === 1) {
      return `Every ${unit}`;
    }
    return `Every ${interval} ${plural}`;
  };

  const formatExecutionTimes = (times: string[] | null | undefined): string => {
    if (!times || times.length === 0) return 'N/A';
    if (times.length === 1) return times[0];
    if (times.length <= 3) return times.join(', ');
    return `${times.slice(0, 2).join(', ')} +${times.length - 2} more`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteClick = (id: number, name: string) => {
    setScheduleToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (scheduleToDelete) {
      onDelete(scheduleToDelete.id);
      setScheduleToDelete(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Execution Times</TableHead>
            <TableHead>Timezone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                Loading schedules...
              </TableCell>
            </TableRow>
          ) : schedules.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-12 text-muted-foreground"
              >
                No schedules found. Create your first schedule to get started.
              </TableCell>
            </TableRow>
          ) : (
            schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{schedule.name}</div>
                    {schedule.description && (
                      <div className="text-xs text-muted-foreground">
                        {schedule.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{formatFrequency(schedule)}</span>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {formatExecutionTimes(schedule.execution_times)}
                  </code>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{schedule.timezone}</span>
                </TableCell>
                <TableCell>
                  {(() => {
                    const badge = getEnabledStatusBadge(schedule.enabled);
                    return <Badge variant={badge.variant}>{badge.label}</Badge>;
                  })()}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatDate(schedule.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {onCalculateNextRun && (
                        <>
                          <DropdownMenuItem
                            onClick={() => onCalculateNextRun(schedule)}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Calculate Next Run
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => onToggleEnabled(schedule)}>
                        {schedule.enabled ? (
                          <>
                            <ToggleLeft className="mr-2 h-4 w-4" />
                            Disable
                          </>
                        ) : (
                          <>
                            <ToggleRight className="mr-2 h-4 w-4" />
                            Enable
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(schedule)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(schedule.id, schedule.name)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Schedule"
        description={`Are you sure you want to delete "${scheduleToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

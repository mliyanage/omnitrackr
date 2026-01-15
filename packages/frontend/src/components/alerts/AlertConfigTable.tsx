import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { deleteAlertConfig, updateAlertConfig } from '@/api/alerts.api';
import { showSuccess, showError } from '@/lib/toast';
import type { AlertConfig, AlertType } from '@/types';

interface AlertConfigTableProps {
  configs: AlertConfig[];
  onEdit: (config: AlertConfig) => void;
  isLoading: boolean;
  isViewer: boolean;
}

const alertTypeLabels: Record<AlertType, string> = {
  sla_breached: 'SLA Breached',
  sla_at_risk: 'SLA At Risk',
  file_arrived: 'File Arrived',
  file_arrived_late: 'File Arrived Late',
};

export function AlertConfigTable({
  configs,
  onEdit,
  isLoading,
  isViewer,
}: AlertConfigTableProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteAlertConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfigs'] });
      showSuccess('Alert configuration deleted successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { enabled: boolean } }) =>
      updateAlertConfig(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alertConfigs'] });
      showSuccess(
        `Alert configuration ${variables.data.enabled ? 'enabled' : 'disabled'} successfully`
      );
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this alert configuration?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggleEnabled = async (config: AlertConfig) => {
    await updateMutation.mutateAsync({
      id: config.id,
      data: { enabled: !config.enabled },
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading alert configurations...
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No alert configurations found. Create one to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Watcher</TableHead>
          <TableHead>Alert Types</TableHead>
          <TableHead>Recipients</TableHead>
          <TableHead>Escalations</TableHead>
          <TableHead>Status</TableHead>
          {!isViewer && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {configs.map((config) => {
          const totalRecipients =
            (config.email_recipients?.length || 0) +
            (config.recipient_group_ids?.length || 0);

          const escalationCount = config.escalations?.length || 0;

          return (
            <TableRow key={config.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{config.watcher?.name || `ID: ${config.watcher_id}`}</div>
                  {config.watcher?.department_code && (
                    <div className="text-xs text-muted-foreground">
                      {config.watcher.department_code}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {config.alert_types.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {alertTypeLabels[type]}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {config.email_enabled ? (
                    <>
                      <div className="font-medium">{totalRecipients} recipient(s)</div>
                      {config.email_cc && config.email_cc.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {config.email_cc.length} CC
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Email disabled</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {escalationCount > 0 ? (
                  <Badge variant="outline">{escalationCount} level(s)</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={config.enabled ? 'success' : 'secondary'}>
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </TableCell>
              {!isViewer && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(config)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleEnabled(config)}>
                        {config.enabled ? (
                          <>
                            <PowerOff className="mr-2 h-4 w-4" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Power className="mr-2 h-4 w-4" />
                            Enable
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(config.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

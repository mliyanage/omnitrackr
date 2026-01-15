import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
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
import { CheckCircle2, Eye } from 'lucide-react';
import { AlertHistoryDetailSheet } from './AlertHistoryDetailSheet';
import { acknowledgeAlert } from '@/api/alerts.api';
import { showSuccess, showError } from '@/lib/toast';
import type { AlertHistory, AlertType, DeliveryStatus } from '@/types';

interface AlertHistoryTableProps {
  alerts: AlertHistory[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  isViewer: boolean;
}

const alertTypeStyles: Record<AlertType, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  sla_breached: { label: 'SLA Breached', variant: 'destructive' },
  sla_at_risk: { label: 'SLA At Risk', variant: 'default' },
  file_arrived: { label: 'File Arrived', variant: 'secondary' },
  file_arrived_late: { label: 'Arrived Late', variant: 'outline' },
};

const deliveryStatusStyles: Record<DeliveryStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  partially_delivered: { label: 'Partial', className: 'bg-orange-100 text-orange-800' },
};

export function AlertHistoryTable({
  alerts,
  pagination,
  isLoading,
  isViewer,
}: AlertHistoryTableProps) {
  const [selectedAlert, setSelectedAlert] = useState<AlertHistory | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const queryClient = useQueryClient();

  const acknowledgeMutation = useMutation({
    mutationFn: (id: number) => acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertHistory'] });
      showSuccess('Alert acknowledged successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleViewDetails = (alert: AlertHistory) => {
    setSelectedAlert(alert);
    setIsDetailSheetOpen(true);
  };

  const handleAcknowledge = async (id: number) => {
    await acknowledgeMutation.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading alert history...
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No alerts found.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Watcher</TableHead>
            <TableHead>Alert Type</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Delivery Status</TableHead>
            <TableHead>Escalation</TableHead>
            <TableHead>Acknowledged</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => {
            const alertTypeStyle = alertTypeStyles[alert.alert_type];
            const deliveryStyle = deliveryStatusStyles[alert.delivery_status];

            return (
              <TableRow key={alert.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {alert.watcher?.name || `ID: ${alert.watcher_id}`}
                    </div>
                    {alert.watcher?.department_code && (
                      <div className="text-xs text-muted-foreground">
                        {alert.watcher.department_code}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={alertTypeStyle.variant}>
                    {alertTypeStyle.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate" title={alert.alert_message}>
                    {alert.alert_message}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={deliveryStyle.className}>
                    {deliveryStyle.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {alert.escalation_level > 0 ? (
                    <Badge variant="outline">Level {alert.escalation_level}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Initial</span>
                  )}
                </TableCell>
                <TableCell>
                  {alert.acknowledged ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Yes</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(alert.created_at), 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(alert.created_at), 'h:mm a')}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(alert)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!alert.acknowledged && !isViewer && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {pagination && (
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {alerts.length} of {pagination.total} results
          </div>
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>
      )}

      {selectedAlert && (
        <AlertHistoryDetailSheet
          open={isDetailSheetOpen}
          onOpenChange={setIsDetailSheetOpen}
          alert={selectedAlert}
          isViewer={isViewer}
        />
      )}
    </>
  );
}

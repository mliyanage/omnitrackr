import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { checkConnectionHealth } from '@/api/connections.api';
import { getConnectionStatusBadge } from '@/lib/badgeHelpers';
import { formatDateTime } from '@/lib/utils';
import { showSuccess, showError } from '@/lib/toast';
import type { SourceConnection } from '@/types';

interface ConnectionHealthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: SourceConnection | null;
}

export function ConnectionHealthSheet({
  open,
  onOpenChange,
  connection,
}: ConnectionHealthSheetProps) {
  const queryClient = useQueryClient();

  const healthCheckMutation = useMutation({
    mutationFn: (id: number) => checkConnectionHealth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      showSuccess('Health check completed successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleTestConnection = async () => {
    if (connection) {
      await healthCheckMutation.mutateAsync(connection.id);
    }
  };

  if (!connection) return null;

  const badge = getConnectionStatusBadge(connection.connection_status, connection.enabled);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px]" side="right">
        <SheetHeader>
          <SheetTitle>Connection Health Details</SheetTitle>
          <SheetDescription>
            View detailed health information for {connection.name}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6 px-4">
            {/* Connection Name and Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{connection.name}</span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              {connection.description && (
                <p className="text-sm text-muted-foreground">{connection.description}</p>
              )}
            </div>

            <Separator />

            {/* Health Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Health Information</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Last Health Check</span>
                  <span className="text-sm font-medium text-right">
                    {formatDateTime(connection.last_health_check)}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Last Successful Connection</span>
                  <span className="text-sm font-medium text-right">
                    {formatDateTime(connection.last_successful_connection)}
                  </span>
                </div>

                {connection.health_check_error && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Error Details</span>
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                      <p className="text-xs text-destructive font-mono break-words">
                        {connection.health_check_error}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Connection Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Connection Details</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium">{connection.type}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Enabled</span>
                  <Badge variant={connection.enabled ? 'success' : 'secondary'}>
                    {connection.enabled ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Button */}
            <div>
              <Button
                onClick={handleTestConnection}
                disabled={healthCheckMutation.isPending}
                className="w-full"
              >
                {healthCheckMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Test Connection Now
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

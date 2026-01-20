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
import type { AlertConfig, AlertType, AlertRecipientGroup } from '@/types';

interface AlertConfigViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: AlertConfig;
  recipientGroups: AlertRecipientGroup[];
}

const alertTypeLabels: Record<AlertType, string> = {
  missing_file: 'Missing File',
  late_arrival: 'Late Arrival',
  sla_violation: 'SLA Violation',
  pattern_mismatch: 'Pattern Mismatch',
  sla_breached: 'SLA Breached',
  sla_at_risk: 'SLA At Risk',
  file_arrived: 'File Arrived',
  file_arrived_late: 'File Arrived Late',
};

export function AlertConfigViewSheet({
  open,
  onOpenChange,
  config,
  recipientGroups,
}: AlertConfigViewSheetProps) {
  if (!config) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getRecipientGroupName = (groupId: number) => {
    const group = recipientGroups.find((g) => g.id === groupId);
    return group?.name || `Group #${groupId}`;
  };

  const totalRecipients =
    (config.email_recipients?.length || 0) +
    (config.recipient_group_ids?.length || 0);

  const escalationCount = config.escalations?.length || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] z-50" side="right">
        <SheetHeader>
          <SheetTitle>Alert Configuration Details</SheetTitle>
          <SheetDescription>
            View alert configuration and notification settings
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] px-4 mt-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Watcher</label>
                  <div className="text-sm font-medium mt-1">
                    {config.watcher?.name || `ID: ${config.watcher_id}`}
                  </div>
                  {config.watcher?.department_code && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {config.watcher.department_code}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={config.enabled ? 'success' : 'secondary'}>
                      {config.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Alert Types */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Alert Types</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Configured Alert Types
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.alert_types.map((type) => (
                      <Badge key={type} variant="secondary">
                        {alertTypeLabels[type]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Email Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Email Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Email Notifications
                  </label>
                  <div className="mt-1">
                    <Badge variant={config.email_enabled ? 'success' : 'secondary'}>
                      {config.email_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>

                {config.email_enabled && (
                  <>
                    {/* Direct Recipients */}
                    {config.email_recipients && config.email_recipients.length > 0 && (
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Email Recipients ({config.email_recipients.length})
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {config.email_recipients.map((email) => (
                            <Badge key={email} variant="outline">
                              {email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CC Recipients */}
                    {config.email_cc && config.email_cc.length > 0 && (
                      <div>
                        <label className="text-sm text-muted-foreground">
                          CC Recipients ({config.email_cc.length})
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {config.email_cc.map((email) => (
                            <Badge key={email} variant="outline">
                              {email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* BCC Recipients */}
                    {config.email_bcc && config.email_bcc.length > 0 && (
                      <div>
                        <label className="text-sm text-muted-foreground">
                          BCC Recipients ({config.email_bcc.length})
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {config.email_bcc.map((email) => (
                            <Badge key={email} variant="outline">
                              {email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recipient Groups */}
                    {config.recipient_group_ids && config.recipient_group_ids.length > 0 && (
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Recipient Groups ({config.recipient_group_ids.length})
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {config.recipient_group_ids.map((groupId) => (
                            <Badge key={groupId} variant="secondary">
                              {getRecipientGroupName(groupId)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Total Recipients
                      </label>
                      <div className="text-sm font-medium mt-1">
                        {totalRecipients} recipient(s)
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Escalations */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Escalation Chains</h3>
              <div className="space-y-3">
                {escalationCount === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No escalation levels configured
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Total Escalation Levels
                      </label>
                      <div className="mt-1">
                        <Badge variant="outline">{escalationCount} level(s)</Badge>
                      </div>
                    </div>
                    {config.escalations && config.escalations.length > 0 && (
                      <div className="space-y-2">
                        {config.escalations.map((esc) => (
                          <div
                            key={esc.id}
                            className="border rounded-lg p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <Badge>Level {esc.escalation_level}</Badge>
                              <span className="text-xs text-muted-foreground">
                                After {esc.delay_minutes} minutes
                              </span>
                            </div>
                            {esc.email_recipients && esc.email_recipients.length > 0 && (
                              <div>
                                <label className="text-xs text-muted-foreground">
                                  Recipients:
                                </label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {esc.email_recipients.map((email) => (
                                    <Badge
                                      key={email}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {email}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
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
                  <div className="text-sm mt-1">{formatDate(config.created_at)}</div>
                  {config.created_by && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      by User #{config.created_by}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Last Updated
                  </label>
                  <div className="text-sm mt-1">{formatDate(config.updated_at)}</div>
                  {config.updated_by && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      by User #{config.updated_by}
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

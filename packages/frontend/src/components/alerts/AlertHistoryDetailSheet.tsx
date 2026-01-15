import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, MessageSquare, Send } from 'lucide-react';
import { getAlertComments, addAlertComment, acknowledgeAlert } from '@/api/alerts.api';
import { showSuccess, showError } from '@/lib/toast';
import type { AlertHistory } from '@/types';

interface AlertHistoryDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: AlertHistory;
  isViewer: boolean;
}

export function AlertHistoryDetailSheet({
  open,
  onOpenChange,
  alert,
  isViewer,
}: AlertHistoryDetailSheetProps) {
  const [acknowledgmentNote, setAcknowledgmentNote] = useState('');
  const [commentText, setCommentText] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['alertComments', alert.id],
    queryFn: () => getAlertComments(alert.id),
    enabled: open,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (note?: string) => acknowledgeAlert(alert.id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertHistory'] });
      showSuccess('Alert acknowledged successfully');
      setAcknowledgmentNote('');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (comment: string) =>
      addAlertComment(alert.id, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertComments', alert.id] });
      showSuccess('Comment added successfully');
      setCommentText('');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleAcknowledge = () => {
    acknowledgeMutation.mutate(acknowledgmentNote || undefined);
  };

  const handleAddComment = () => {
    if (commentText.trim()) {
      addCommentMutation.mutate(commentText);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] p-6" side="right">
        <SheetHeader>
          <SheetTitle>Alert Details</SheetTitle>
          <SheetDescription>
            View alert information and manage acknowledgments
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <div className="space-y-6">
            {/* Alert Information */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Watcher</Label>
                <div className="text-sm font-medium mt-1">
                  {alert.watcher?.name || `ID: ${alert.watcher_id}`}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Alert Type</Label>
                <div className="mt-1">
                  <Badge>{alert.alert_type.replace(/_/g, ' ').toUpperCase()}</Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <div className="text-sm mt-1">{alert.alert_message}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Delivery Status</Label>
                  <div className="text-sm font-medium mt-1">
                    {alert.delivery_status.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Escalation Level</Label>
                  <div className="text-sm font-medium mt-1">
                    {alert.escalation_level === 0 ? 'Initial' : `Level ${alert.escalation_level}`}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <div className="text-sm mt-1">
                  {format(new Date(alert.created_at), 'PPpp')}
                </div>
              </div>

              {alert.retry_count > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Retry Information</Label>
                  <div className="text-sm mt-1">
                    Retried {alert.retry_count} of {alert.max_retries} times
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Acknowledgment Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-semibold">Acknowledgment</h3>
              </div>

              {alert.acknowledged ? (
                <div className="rounded-lg border bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Acknowledged</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {alert.acknowledged_by_user?.name} on{' '}
                    {alert.acknowledged_at &&
                      format(new Date(alert.acknowledged_at), 'PPpp')}
                  </div>
                  {alert.acknowledgment_note && (
                    <div className="mt-2 text-sm">
                      <strong>Note:</strong> {alert.acknowledgment_note}
                    </div>
                  )}
                </div>
              ) : (
                !isViewer && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="acknowledgment-note">
                        Acknowledgment Note (optional)
                      </Label>
                      <Textarea
                        id="acknowledgment-note"
                        value={acknowledgmentNote}
                        onChange={(e) => setAcknowledgmentNote(e.target.value)}
                        placeholder="Add a note about this acknowledgment..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleAcknowledge}
                      disabled={acknowledgeMutation.isPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Acknowledge Alert
                    </Button>
                  </div>
                )
              )}
            </div>

            <Separator />

            {/* Comments Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-semibold">Comments</h3>
                <Badge variant="secondary">{comments.length}</Badge>
              </div>

              {/* Add Comment */}
              {!isViewer && (
                <div className="space-y-3">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    size="sm"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Add Comment
                  </Button>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No comments yet.
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg border p-3 bg-accent/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-sm">
                          {comment.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'PPp')}
                        </div>
                      </div>
                      <div className="text-sm">{comment.comment}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Alert Context (if available) */}
            {alert.alert_context && Object.keys(alert.alert_context).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Additional Context</h3>
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(alert.alert_context, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

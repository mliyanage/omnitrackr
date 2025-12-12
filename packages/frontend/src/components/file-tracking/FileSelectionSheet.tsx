import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { getWatcherFiles, type S3File } from '@/api/watchers.api';
import { markFileAsArrived } from '@/api/fileTracking.api';
import type { FileTracking } from '@/api/fileTracking.api';
import { formatDateTime, formatFileSize, cn } from '@/lib/utils';
import { showError, showSuccess } from '@/lib/toast';

interface FileSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackingRecord: FileTracking | null;
  onSuccess: () => void;
}

export function FileSelectionSheet({
  open,
  onOpenChange,
  trackingRecord,
  onSuccess,
}: FileSelectionSheetProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);

  // Fetch files from S3
  const { data: files, isLoading, error } = useQuery({
    queryKey: ['watcher-files', trackingRecord?.watcher_id],
    queryFn: () => getWatcherFiles(trackingRecord!.watcher_id),
    enabled: open && !!trackingRecord?.watcher_id,
  });

  // Mark file as arrived mutation
  const markAsArrivedMutation = useMutation({
    mutationFn: (file: S3File) => {
      if (!trackingRecord) throw new Error('No tracking record');
      return markFileAsArrived(trackingRecord.id, {
        file_path: file.file_path,
        file_name: file.file_name,
        file_size: file.file_size,
        arrived_at: new Date(file.last_modified).toISOString(),
      });
    },
    onSuccess: () => {
      showSuccess('File marked as arrived successfully');
      queryClient.invalidateQueries({ queryKey: ['file-tracking'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleSelectFile = (file: S3File) => {
    setSelectedFile(file);
  };

  const handleConfirm = () => {
    if (selectedFile) {
      markAsArrivedMutation.mutate(selectedFile);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] z-[60]" side="right">
        <SheetHeader>
          <SheetTitle>Select File to Mark as Arrived</SheetTitle>
          <SheetDescription>
            Choose a file from the source to link to this tracking record
          </SheetDescription>
        </SheetHeader>

        {trackingRecord && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">Expected Pattern:</span>{' '}
                <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                  {trackingRecord.expected_pattern}
                </code>
              </div>
              <div>
                <span className="font-medium">Expected At:</span>{' '}
                {formatDateTime(trackingRecord.expected_at)}
              </div>
              <div>
                <span className="font-medium">SLA Deadline:</span>{' '}
                {formatDateTime(trackingRecord.sla_deadline)}
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-320px)] pr-4 mt-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading files...
              </span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-sm text-destructive">
                Failed to load files. Please try again.
              </p>
            </div>
          )}

          {!isLoading && !error && files && files.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No files found matching the watcher pattern
              </p>
            </div>
          )}

          {!isLoading && !error && files && files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <button
                  key={`${file.file_path}-${index}`}
                  onClick={() => handleSelectFile(file)}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border transition-colors',
                    'hover:bg-accent hover:border-accent-foreground/20',
                    selectedFile?.file_path === file.file_path
                      ? 'bg-accent border-accent-foreground/50'
                      : 'bg-background'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <p className="font-medium text-sm truncate">
                          {file.file_name}
                        </p>
                        {selectedFile?.file_path === file.file_path && (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {file.file_path}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>Modified: {formatDateTime(file.last_modified.toString())}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={markAsArrivedMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFile || markAsArrivedMutation.isPending}
          >
            {markAsArrivedMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Mark as Arrived
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

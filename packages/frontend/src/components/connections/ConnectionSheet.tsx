import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConnectionForm } from './ConnectionForm';
import type { SourceConnection } from '@/types';

interface ConnectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: SourceConnection;
  onSuccess: (connection: SourceConnection) => void;
}

export function ConnectionSheet({
  open,
  onOpenChange,
  connection,
  onSuccess,
}: ConnectionSheetProps) {
  const isEditing = !!connection;

  const handleSuccess = (newConnection: SourceConnection) => {
    onSuccess(newConnection);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Use z-[60] for nested sheet to appear above parent watcher sheet (z-50) */}
      <SheetContent className="sm:max-w-[600px] z-[60]" side="right">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Edit Connection' : 'Create New Connection'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the connection details below.'
              : 'Configure a new source connection for file monitoring.'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <ConnectionForm
            connection={connection}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

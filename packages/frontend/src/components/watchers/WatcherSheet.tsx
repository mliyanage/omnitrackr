import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WatcherForm } from './WatcherForm';
import type { Watcher } from '@/types';

interface WatcherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watcher?: Watcher;
  onSuccess: (watcher: Watcher) => void;
}

export function WatcherSheet({
  open,
  onOpenChange,
  watcher,
  onSuccess,
}: WatcherSheetProps) {
  const isEditing = !!watcher;

  const handleSuccess = (newWatcher: Watcher) => {
    onSuccess(newWatcher);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Parent sheet uses z-50 - nested sheets will use z-[60] */}
      <SheetContent className="sm:max-w-[700px] z-50" side="right">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Edit Watcher' : 'Create New Watcher'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the watcher configuration below.'
              : 'Configure a new file watcher to monitor data sources for file arrivals.'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <WatcherForm
            watcher={watcher}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

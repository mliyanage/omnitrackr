import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScheduleForm } from './ScheduleForm';
import type { Schedule } from '@/types';

interface ScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: Schedule;
  onSuccess: (schedule: Schedule) => void;
}

export function ScheduleSheet({
  open,
  onOpenChange,
  schedule,
  onSuccess,
}: ScheduleSheetProps) {
  const isEditing = !!schedule;

  const handleSuccess = (newSchedule: Schedule) => {
    onSuccess(newSchedule);
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
            {isEditing ? 'Edit Schedule' : 'Create New Schedule'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the schedule configuration below.'
              : 'Configure a new schedule for file monitoring.'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <ScheduleForm
            schedule={schedule}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

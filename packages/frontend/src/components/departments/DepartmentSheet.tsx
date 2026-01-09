import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DepartmentForm } from './DepartmentForm';
import type { Department } from '@/types';

interface DepartmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department;
  onSuccess: () => void;
}

export function DepartmentSheet({
  open,
  onOpenChange,
  department,
  onSuccess,
}: DepartmentSheetProps) {
  const isEditing = !!department;

  const handleSuccess = () => {
    onSuccess();
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
            {isEditing ? 'Edit Department' : 'Create New Department'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the department details below.'
              : 'Configure a new department for organizing watchers.'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <DepartmentForm
            department={department}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

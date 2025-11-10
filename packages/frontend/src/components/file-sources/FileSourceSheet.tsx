import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileSource, updateFileSource } from '@/api/fileSources.api';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { S3ConfigForm } from './S3ConfigForm';
import type { FileSource, CreateFileSourceRequest, UpdateFileSourceRequest } from '@/types';

interface FileSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: FileSource | null;
}

export function FileSourceSheet({ open, onOpenChange, source }: FileSourceSheetProps) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createFileSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-sources'] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFileSourceRequest }) => updateFileSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-sources'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = async (data: CreateFileSourceRequest) => {
    if (source) {
      await updateMutation.mutateAsync({ id: String(source.id), data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl px-6">
        <SheetHeader className="px-0">
          <SheetTitle>
            {source ? 'Edit File Source' : 'Add File Source'}
          </SheetTitle>
          <SheetDescription>
            {source
              ? 'Update the configuration for this file source'
              : 'Configure a new file exchange source'}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-0">
          <S3ConfigForm
            onSubmit={handleSubmit}
            initialData={source}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

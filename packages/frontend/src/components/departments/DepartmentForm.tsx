import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createRefData, updateRefData, getDepartments } from '@/api/refData.api';
import type { RefData } from '@/types';
import { showError } from '@/lib/toast';

const departmentFormSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  abbreviation: z.string().min(1, 'Department code is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).optional().nullable(),
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

interface DepartmentFormProps {
  department?: RefData;
  onSuccess: (department: RefData) => void;
  onCancel: () => void;
}

export function DepartmentForm({
  department,
  onSuccess,
  onCancel,
}: DepartmentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!department;
  const [nameError, setNameError] = useState<string | null>(null);

  // Fetch existing departments to check for duplicates
  const { data: existingDepartments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: department
      ? {
          name: department.value1 || '',
          abbreviation: department.value2 || '',
          description: (department.metadata as any)?.description || '',
          is_active: (department.metadata as any)?.is_active !== false,
          sort_order: (department.metadata as any)?.sort_order || null,
        }
      : {
          name: '',
          abbreviation: '',
          description: '',
          is_active: true,
          sort_order: null,
        },
  });

  const createMutation = useMutation({
    mutationFn: createRefData,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      onSuccess(data);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<typeof createRefData> }) =>
      updateRefData(code, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      onSuccess(data);
    },
    onError: (error) => {
      showError(error);
    },
  });

  // Check for duplicate department name
  const checkDuplicateName = (name: string): boolean => {
    if (!name.trim()) return false;

    const duplicateExists = existingDepartments.some(
      (dept) =>
        dept.value1?.toLowerCase() === name.toLowerCase() &&
        (!isEditing || dept.id !== department?.id) // Allow same name when editing same department
    );

    if (duplicateExists) {
      setNameError(`Department "${name}" already exists`);
      return true;
    }

    setNameError(null);
    return false;
  };

  // Watch name field for changes
  const watchedName = form.watch('name');
  useEffect(() => {
    if (watchedName) {
      checkDuplicateName(watchedName);
    }
  }, [watchedName, existingDepartments]);

  const onSubmit = (data: DepartmentFormValues) => {
    // Final validation before submit
    if (checkDuplicateName(data.name)) {
      form.setError('name', {
        type: 'manual',
        message: `Department "${data.name}" already exists`,
      });
      return;
    }

    const payload = {
      value1: data.name,
      value2: data.abbreviation,
      metadata: {
        description: data.description,
        is_active: data.is_active,
        sort_order: data.sort_order,
      },
    };

    if (isEditing) {
      updateMutation.mutate({
        code: department!.code,
        data: payload,
      });
    } else {
      createMutation.mutate({
        code: `DEPARTMENT:${data.name}`,
        ...payload,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Details</CardTitle>
            <CardDescription>
              Configure the department information and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Finance"
                      {...field}
                      className={nameError ? 'border-red-500' : ''}
                    />
                  </FormControl>
                  <FormDescription>
                    The display name for this department (e.g., Finance, Operations)
                  </FormDescription>
                  {nameError && (
                    <p className="text-sm text-red-600 font-medium mt-1">
                      {nameError}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="abbreviation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="FIN"
                      {...field}
                      className="font-mono text-sm"
                    />
                  </FormControl>
                  <FormDescription>
                    A unique identifier for this department (e.g., FIN, HR, IT)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this department"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      value={field.value || ''}
                      className="max-w-[200px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Lower numbers appear first in lists
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Active Department
                    </FormLabel>
                    <FormDescription>
                      Inactive departments will be hidden from selection
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !!nameError}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Department' : 'Create Department'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

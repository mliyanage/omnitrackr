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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  createDepartment,
  updateDepartment,
  listDepartments,
  type CreateDepartmentRequest,
  type UpdateDepartmentRequest,
} from '@/api/departments.api';
import type { Department } from '@/types';
import { showError } from '@/lib/toast';

const departmentFormSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z
    .string()
    .min(1, 'Department code is required')
    .max(10, 'Department code must be 10 characters or less')
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers, or underscores only'),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

interface DepartmentFormProps {
  department?: Department;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DepartmentForm({ department, onSuccess, onCancel }: DepartmentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!department;
  const [codeError, setCodeError] = useState<string | null>(null);

  // Fetch existing departments to check for duplicates
  const { data: existingDepartments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    select: (response) => response.data || [],
  });

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: department
      ? {
          name: department.name,
          code: department.code,
          description: department.description || '',
          status: department.status,
        }
      : {
          name: '',
          code: '',
          description: '',
          status: 'active',
        },
  });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      onSuccess();
    },
    onError: showError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDepartmentRequest }) =>
      updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      onSuccess();
    },
    onError: showError,
  });

  // Validate code uniqueness
  const validateCode = (code: string): boolean => {
    setCodeError(null);

    const duplicate = existingDepartments.find(
      (d) => d.code === code && (!isEditing || d.id !== department.id)
    );

    if (duplicate) {
      setCodeError('This code is already used by another department');
      return false;
    }

    return true;
  };

  // Watch code field for validation
  const codeValue = form.watch('code');
  useEffect(() => {
    if (codeValue) {
      validateCode(codeValue);
    }
  }, [codeValue, existingDepartments]);

  const onSubmit = async (values: DepartmentFormValues) => {
    // Final validation
    if (!validateCode(values.code)) {
      form.setError('code', {
        type: 'manual',
        message: codeError || 'Invalid code',
      });
      return;
    }

    if (isEditing && department) {
      const updateData: UpdateDepartmentRequest = {
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        status: values.status,
      };
      await updateMutation.mutateAsync({ id: department.id, data: updateData });
    } else {
      const createData: CreateDepartmentRequest = {
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        status: values.status,
      };
      await createMutation.mutateAsync(createData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the department name and a unique code for identification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Department Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Finance" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormDescription>The full name of the department</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Department Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Code *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., FIN"
                      {...field}
                      disabled={isLoading}
                      onChange={(e) => {
                        const uppercase = e.target.value.toUpperCase();
                        field.onChange(uppercase);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    A short, unique code (uppercase letters, numbers, underscores only)
                  </FormDescription>
                  {codeError && <p className="text-sm text-destructive">{codeError}</p>}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the department..."
                      {...field}
                      disabled={isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>Optional description of the department's purpose</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Inactive departments are hidden from selection lists
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !!codeError} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>{isEditing ? 'Update Department' : 'Create Department'}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { updateUser, assignDepartments } from '@/api/users.api';
import { showError } from '@/lib/toast';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DepartmentMultiSelect } from '@/components/departments/DepartmentMultiSelect';
import { Loader2 } from 'lucide-react';
import type { UserWithDepartments, UserRole, UserStatus } from '@/types';

/**
 * User edit form schema
 */
const editSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum(['owner', 'editor', 'viewer'] as const, {
    required_error: 'Please select a role',
  }),
  status: z.enum(['active', 'inactive', 'suspended'] as const),
  department_ids: z.array(z.number()),
});

type EditFormValues = z.infer<typeof editSchema>;

interface UserEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserWithDepartments;
  onSuccess: () => void;
}

/**
 * UserEditSheet Component
 * Form sheet for editing existing users
 */
export function UserEditSheet({ open, onOpenChange, user, onSuccess }: UserEditSheetProps) {
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      role: 'viewer',
      status: 'active',
      department_ids: [],
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: any }) => updateUser(userId, data),
    onError: showError,
  });

  // Assign departments mutation
  const assignDepartmentsMutation = useMutation({
    mutationFn: ({ userId, departmentIds }: { userId: number; departmentIds: number[] }) =>
      assignDepartments(userId, departmentIds),
    onError: showError,
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || '',
        role: user.role as 'owner' | 'editor' | 'viewer',
        status: user.status,
        department_ids: user.departments?.map((d) => d.id) || [],
      });
    }
  }, [user, form]);

  // Handle form submission
  const onSubmit = async (values: EditFormValues) => {
    if (!user) return;

    try {
      // Update user details
      await updateMutation.mutateAsync({
        userId: user.id,
        data: {
          firstName: values.first_name,
          lastName: values.last_name,
          phone: values.phone || undefined,
          role: values.role as UserRole,
          status: values.status as UserStatus,
        },
      });

      // Update department assignments
      await assignDepartmentsMutation.mutateAsync({
        userId: user.id,
        departmentIds: values.department_ids,
      });

      onSuccess();
    } catch {
      // Errors already handled by mutations
    }
  };

  const isPending = updateMutation.isPending || assignDepartmentsMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px]" side="right">
        <SheetHeader>
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>Update user details and permissions</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="px-6 pr-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {/* First Name */}
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Last Name */}
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
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
                          value={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="permissions" className="space-y-4 mt-4">
                  {/* Role */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="owner">Owner - Full access</SelectItem>
                            <SelectItem value="editor">Editor - Can modify resources</SelectItem>
                            <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Departments */}
                  <FormField
                    control={form.control}
                    name="department_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departments</FormLabel>
                        <FormControl>
                          <DepartmentMultiSelect
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isPending}
                            placeholder="Select departments..."
                          />
                        </FormControl>
                        <FormDescription>
                          Assign departments for editors and viewers
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

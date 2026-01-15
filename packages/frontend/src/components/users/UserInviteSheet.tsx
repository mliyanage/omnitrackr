import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { inviteUser } from '@/api/users.api';
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
import { Checkbox } from '@/components/ui/checkbox';
import { DepartmentMultiSelect } from '@/components/departments/DepartmentMultiSelect';
import { Loader2, Mail } from 'lucide-react';
import type { UserRole } from '@/types';

/**
 * User invite form schema
 */
const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(['owner', 'editor', 'viewer'] as const, {
    required_error: 'Please select a role',
  }),
  department_ids: z.array(z.number()).min(1, 'Please select at least one department'),
  send_email: z.boolean().default(true),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface UserInviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * UserInviteSheet Component
 * Form sheet for inviting new users to the organization
 */
export function UserInviteSheet({ open, onOpenChange, onSuccess }: UserInviteSheetProps) {
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      role: 'viewer',
      department_ids: [],
      send_email: true,
    },
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      form.reset();
      onSuccess();
    },
    onError: showError,
  });

  // Handle form submission
  const onSubmit = (values: InviteFormValues) => {
    const data = {
      email: values.email,
      firstName: values.first_name,
      lastName: values.last_name,
      role: values.role as UserRole,
      departmentIds: values.department_ids,
    };

    inviteMutation.mutate(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px]" side="right">
        <SheetHeader>
          <SheetTitle>Invite User</SheetTitle>
          <SheetDescription>
            Send an invitation to a new user to join your organization
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="px-6 pr-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        {...field}
                        disabled={inviteMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* First Name */}
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        {...field}
                        disabled={inviteMutation.isPending}
                      />
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
                      <Input
                        placeholder="Doe"
                        {...field}
                        disabled={inviteMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                      disabled={inviteMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="owner">Owner - Full access to all resources</SelectItem>
                        <SelectItem value="editor">
                          Editor - Can create and modify resources in assigned departments
                        </SelectItem>
                        <SelectItem value="viewer">
                          Viewer - Read-only access to assigned departments
                        </SelectItem>
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
                    <FormLabel>Departments *</FormLabel>
                    <FormControl>
                      <DepartmentMultiSelect
                        value={field.value}
                        onChange={field.onChange}
                        disabled={inviteMutation.isPending}
                        placeholder="Select departments..."
                      />
                    </FormControl>
                    <FormDescription>
                      Select one or more departments for this user
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Send Email Checkbox */}
              <FormField
                control={form.control}
                name="send_email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={inviteMutation.isPending}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2 cursor-pointer">
                        <Mail className="h-3 w-3" />
                        Send invitation email
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  disabled={inviteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    'Send Invitation'
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

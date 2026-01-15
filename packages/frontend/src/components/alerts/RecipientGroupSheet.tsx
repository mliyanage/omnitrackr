import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import {
  createRecipientGroup,
  updateRecipientGroup,
  deleteRecipientGroup,
} from '@/api/alerts.api';
import { showSuccess, showError } from '@/lib/toast';
import type { AlertRecipientGroup } from '@/types';

interface RecipientGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: AlertRecipientGroup;
}

export function RecipientGroupSheet({
  open,
  onOpenChange,
  group,
}: RecipientGroupSheetProps) {
  const isEditing = !!group;
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailAddresses, setEmailAddresses] = useState<string[]>([]);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
      setEmailAddresses(group.email_addresses);
    } else {
      setName('');
      setDescription('');
      setEmailAddresses([]);
    }
  }, [group, open]);

  const createMutation = useMutation({
    mutationFn: createRecipientGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipientGroups'] });
      showSuccess('Recipient group created successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateRecipientGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipientGroups'] });
      queryClient.invalidateQueries({ queryKey: ['alertConfigs'] });
      showSuccess('Recipient group updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecipientGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipientGroups'] });
      queryClient.invalidateQueries({ queryKey: ['alertConfigs'] });
      showSuccess('Recipient group deleted successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const email = emailInput.trim();

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && emailRegex.test(email) && !emailAddresses.includes(email)) {
        setEmailAddresses([...emailAddresses, email]);
        setEmailInput('');
      } else if (email && !emailRegex.test(email)) {
        showError(new Error('Please enter a valid email address'));
      }
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmailAddresses(emailAddresses.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError(new Error('Name is required'));
      return;
    }

    if (emailAddresses.length === 0) {
      showError(new Error('At least one email address is required'));
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      email_addresses: emailAddresses,
    };

    if (isEditing) {
      updateMutation.mutate({ id: group.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (group && window.confirm('Are you sure you want to delete this recipient group?')) {
      deleteMutation.mutate(group.id);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] p-6" side="right">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Edit Recipient Group' : 'Create Recipient Group'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the recipient group details below.'
              : 'Create a reusable group of email recipients for alerts.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Operations Team, Support Team"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this group"
              rows={3}
            />
          </div>

          {/* Email Addresses */}
          <div className="space-y-2">
            <Label htmlFor="email-input">
              Email Addresses <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email-input"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleAddEmail}
              placeholder="Type email and press Enter or comma"
            />
            <p className="text-xs text-muted-foreground">
              Press Enter or comma to add multiple email addresses
            </p>

            {/* Email Tags */}
            {emailAddresses.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 p-3 border rounded-lg bg-muted/50">
                {emailAddresses.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveEmail(email)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={
                createMutation.isPending || updateMutation.isPending
              }
            >
              {isEditing ? 'Update' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="ml-auto"
              >
                Delete
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

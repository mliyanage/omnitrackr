import { useState } from 'react';
import { MoreHorizontal, Mail, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { UserInvitation } from '@/api/invitations.api';

interface InvitationTableProps {
  invitations: UserInvitation[];
  onResend: (invitation: UserInvitation) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export function InvitationTable({
  invitations,
  onResend,
  onDelete,
  isLoading = false,
}: InvitationTableProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<{
    id: number;
    email: string;
  } | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
  };

  const handleDeleteClick = (id: number, email: string) => {
    setInvitationToDelete({ id, email });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (invitationToDelete) {
      onDelete(invitationToDelete.id);
      setInvitationToDelete(null);
    }
  };

  const parseDepartmentIds = (departmentIds?: number[] | string): number[] => {
    if (!departmentIds) return [];
    if (Array.isArray(departmentIds)) return departmentIds;
    try {
      return JSON.parse(departmentIds);
    } catch {
      return [];
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Departments</TableHead>
            <TableHead>Invited</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                Loading invitations...
              </TableCell>
            </TableRow>
          ) : invitations.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-12 text-muted-foreground"
              >
                No pending invitations found.
              </TableCell>
            </TableRow>
          ) : (
            invitations.map((invitation) => {
              const deptIds = parseDepartmentIds(invitation.department_ids);
              const expiringSoon = isExpiringSoon(invitation.expires_at);

              return (
                <TableRow key={invitation.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{invitation.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(invitation.role)}>
                      {invitation.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {deptIds.length > 0 ? (
                      <span className="text-sm text-muted-foreground">
                        {deptIds.length} department{deptIds.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">All departments</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(invitation.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {expiringSoon && (
                        <Clock className="h-3 w-3 text-orange-500" />
                      )}
                      <span className={`text-sm ${expiringSoon ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                        {formatRelativeTime(invitation.expires_at)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onResend(invitation)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Resend Invitation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(invitation.id, invitation.email)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Cancel Invitation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Cancel Invitation"
        description={`Are you sure you want to cancel the invitation for "${invitationToDelete?.email}"? They will no longer be able to use this invitation link.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Cancel Invitation"
        cancelText="Keep Invitation"
        variant="destructive"
      />
    </div>
  );
}

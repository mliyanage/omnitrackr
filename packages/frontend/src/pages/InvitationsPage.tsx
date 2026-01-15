import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MailPlus, Users, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvitationTable } from '@/components/users/InvitationTable';
import {
  getPendingInvitations,
  resendInvitation,
  deleteInvitation,
  type UserInvitation,
} from '@/api/invitations.api';
import { showSuccess, showError } from '@/lib/toast';
import { useNavigate } from 'react-router-dom';

export default function InvitationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => getPendingInvitations(),
  });

  const resendMutation = useMutation({
    mutationFn: resendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      showSuccess('Invitation resent successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      showSuccess('Invitation cancelled successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleResend = async (invitation: UserInvitation) => {
    await resendMutation.mutateAsync(invitation.id);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleInviteUser = () => {
    navigate('/users');
  };

  // Calculate summary stats
  const totalInvitations = invitations.length;
  const expiringInvitations = invitations.filter((inv) => {
    const expiryDate = new Date(inv.expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
  }).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Invitations</h1>
          <p className="text-muted-foreground">
            Manage user invitations for your organization
          </p>
        </div>
        <Button onClick={handleInviteUser}>
          <MailPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvitations}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting acceptance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringInvitations}</div>
            <p className="text-xs text-muted-foreground">
              Within 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valid Duration</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7 Days</div>
            <p className="text-xs text-muted-foreground">
              From invitation date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            View and manage all pending user invitations. Invitations expire after 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvitationTable
            invitations={invitations}
            onResend={handleResend}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

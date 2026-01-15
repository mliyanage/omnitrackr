import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users as UsersIcon, UserCheck, UserX, Shield, MailPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { listUsers, deactivateUser } from '@/api/users.api';
import { showSuccess, showError } from '@/lib/toast';
import { useAuthStore, useHasRole } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';
import type { UserWithDepartments, UserRole, UserStatus } from '@/types';
import { MoreHorizontal, Mail, Edit, Trash2 } from 'lucide-react';
import { UserInviteSheet } from '@/components/users/UserInviteSheet';
import { UserEditSheet } from '@/components/users/UserEditSheet';

/**
 * UsersPage Component
 * User management page for Owners and Super Admins
 */
export default function UsersPage() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<UserWithDepartments | undefined>();
  const [isInviteSheetOpen, setIsInviteSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isOwnerOrAdmin = useHasRole('owner', 'super_admin');

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    select: (response) => response.data || [],
  });

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('User deactivated successfully');
    },
    onError: showError,
  });

  // Handlers
  const handleInviteNew = () => {
    setIsInviteSheetOpen(true);
  };

  const handleEdit = (user: UserWithDepartments) => {
    setSelectedUser(user);
    setIsEditSheetOpen(true);
  };

  const handleDeactivate = async (userId: number) => {
    if (confirm('Are you sure you want to deactivate this user?')) {
      await deactivateMutation.mutateAsync(userId);
    }
  };

  const handleInviteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['invitations'] });
    setIsInviteSheetOpen(false);
    showSuccess('User invited successfully');
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setIsEditSheetOpen(false);
    setSelectedUser(undefined);
    showSuccess('User updated successfully');
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch =
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
  };

  // Helper functions
  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'owner':
        return 'default';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage your organization's users and permissions
          </p>
        </div>
        {isOwnerOrAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/invitations')}>
              <MailPlus className="mr-2 h-4 w-4" />
              View Invitations
            </Button>
            <Button onClick={handleInviteNew}>
              <Plus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspended}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                {currentUser?.role === 'super_admin' && (
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your filters
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Departments</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.first_name} {user.last_name}
                          {user.two_fa_enabled && (
                            <Shield className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {formatRole(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.departments && user.departments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.departments.slice(0, 2).map((dept) => (
                              <Badge key={dept.id} variant="outline" className="text-xs">
                                {dept.code}
                              </Badge>
                            ))}
                            {user.departments.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.departments.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No departments</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                      </TableCell>
                      <TableCell>
                        {isOwnerOrAdmin && user.id !== currentUser?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeactivate(user.id)}
                                className="text-red-600"
                                disabled={user.status === 'inactive'}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite User Sheet */}
      <UserInviteSheet
        open={isInviteSheetOpen}
        onOpenChange={setIsInviteSheetOpen}
        onSuccess={handleInviteSuccess}
      />

      {/* Edit User Sheet */}
      <UserEditSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        user={selectedUser}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}

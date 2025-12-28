import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  MoreHorizontal,
  Play,
  Pencil,
  Trash2,
  Ban,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getWatcherStatusBadge, getPollStatusBadge } from '@/lib/badgeHelpers';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { WatcherSheet } from '@/components/watchers/WatcherSheet';
import { WatcherViewSheet } from '@/components/watchers/WatcherViewSheet';
import { getWatchers, deleteWatcher, triggerWatcherPoll, updateWatcherStatus } from '@/api/watchers.api';
import { getDepartments } from '@/api/refData.api';
import { showSuccess, showError } from '@/lib/toast';
import type { Watcher } from '@/types';

export default function WatchersPage() {
  const [selectedWatcher, setSelectedWatcher] = useState<Watcher | undefined>();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [viewWatcher, setViewWatcher] = useState<Watcher | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [watcherToDelete, setWatcherToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: watchers = [], isLoading } = useQuery({
    queryKey: ['watchers'],
    queryFn: () => getWatchers(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWatcher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchers'] });
      showSuccess('Watcher deleted successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const pollMutation = useMutation({
    mutationFn: triggerWatcherPoll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchers'] });
      showSuccess('Watcher poll triggered successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'paused' | 'disabled' | 'error' }) =>
      updateWatcherStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchers'] });
      showSuccess('Watcher status updated successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleCreateNew = () => {
    setSelectedWatcher(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (watcher: Watcher) => {
    setSelectedWatcher(watcher);
    setIsSheetOpen(true);
  };

  const handleView = (watcher: Watcher) => {
    setViewWatcher(watcher);
    setIsViewSheetOpen(true);
  };

  const handleDeleteClick = (id: number, name: string) => {
    setWatcherToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (watcherToDelete) {
      await deleteMutation.mutateAsync(watcherToDelete.id);
      setWatcherToDelete(null);
    }
  };

  const handleTriggerPoll = async (id: number) => {
    await pollMutation.mutateAsync(id);
  };

  const handleStatusChange = async (id: number, status: 'active' | 'paused' | 'disabled' | 'error') => {
    await updateStatusMutation.mutateAsync({ id, status });
  };

  const handleSheetSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['watchers'] });
    showSuccess(
      selectedWatcher
        ? 'Watcher updated successfully'
        : 'Watcher created successfully'
    );
  };

  // Filter watchers
  const filteredWatchers = watchers.filter((watcher) => {
    const matchesSearch =
      searchQuery === '' ||
      watcher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      watcher.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || watcher.status === statusFilter;

    const matchesDepartment =
      departmentFilter === 'all' ||
      watcher.department_code === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const formatLastCheck = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Watchers</h1>
          <p className="text-muted-foreground">
            Monitor and track file arrivals across your data sources
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Watcher
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search watchers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.code}>
                {dept.value1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead>Pattern</TableHead>
              <TableHead>Last Check</TableHead>
              <TableHead>Last Status</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead>Files Detected</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  Loading watchers...
                </TableCell>
              </TableRow>
            ) : filteredWatchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No watchers found. Create your first watcher to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredWatchers.map((watcher) => (
                <TableRow key={watcher.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{watcher.name}</div>
                      {watcher.description && (
                        <div className="text-xs text-muted-foreground">
                          {watcher.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const badge = getWatcherStatusBadge(watcher.status);
                      return <Badge variant={badge.variant}>{badge.label}</Badge>;
                    })()}
                  </TableCell>
                  <TableCell>
                    {watcher.source_connection?.name || `#${watcher.source_connection_id}`}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {watcher.file_name_pattern || watcher.file_path_pattern || '*'}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatLastCheck(watcher.last_check_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const badge = getPollStatusBadge(watcher.last_check_status);
                      return <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>;
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {Number(watcher.success_rate || 0).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{watcher.total_files_detected ?? 0}</span>
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
                        <DropdownMenuItem onClick={() => handleTriggerPoll(watcher.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          Trigger Poll
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleView(watcher)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(watcher)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {watcher.status === 'active' ? (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(watcher.id, 'disabled')}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Disable
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(watcher.id, 'active')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(watcher.id, watcher.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Watchers</div>
          <div className="text-2xl font-bold">{watchers.length}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold">
            {watchers.filter((w) => w.status === 'active').length}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Files Detected</div>
          <div className="text-2xl font-bold">
            {watchers.reduce((sum, w) => sum + (w.total_files_detected ?? 0), 0)}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Avg Success Rate</div>
          <div className="text-2xl font-bold">
            {watchers.length > 0
              ? (
                  watchers.reduce((sum, w) => sum + w.success_rate, 0) /
                  watchers.length
                ).toFixed(1)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Watcher Sheet */}
      <WatcherSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        watcher={selectedWatcher}
        onSuccess={handleSheetSuccess}
      />

      {/* Watcher View Sheet */}
      <WatcherViewSheet
        open={isViewSheetOpen}
        onOpenChange={setIsViewSheetOpen}
        watcher={viewWatcher}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Watcher"
        description={`Are you sure you want to delete "${watcherToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

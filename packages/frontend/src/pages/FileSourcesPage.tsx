import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Power, Eye } from 'lucide-react';
import { getFileSources, deleteFileSource, toggleFileSource } from '@/api/fileSources.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSourceSheet, FileSourceDetailSheet } from '@/components/file-sources';
import type { FileSource } from '@/types';

export function FileSourcesPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<FileSource | null>(null);
  const [detailSource, setDetailSource] = useState<FileSource | null>(null);
  const queryClient = useQueryClient();

  // Fetch file sources
  const { data: fileSources, isLoading, error } = useQuery({
    queryKey: ['file-sources'],
    queryFn: getFileSources,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFileSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-sources'] });
    },
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: toggleFileSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-sources'] });
    },
  });

  const handleAddSource = () => {
    setSelectedSource(null);
    setIsSheetOpen(true);
  };

  const handleViewDetails = (source: FileSource) => {
    setDetailSource(source);
    setIsDetailSheetOpen(true);
  };

  const handleEditSource = (source: FileSource) => {
    setSelectedSource(source);
    setIsSheetOpen(true);
  };

  const handleEditFromDetail = () => {
    setSelectedSource(detailSource);
    setIsDetailSheetOpen(false);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this file source?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggle = async (id: string) => {
    await toggleMutation.mutateAsync(id);
  };

  const formatSourceType = (type: string | undefined) => {
    if (!type) return 'N/A';
    return type.replace(/_/g, ' ');
  };

  const formatStatus = (status: string | undefined, enabled: boolean | undefined) => {
    if (!status) return 'Unknown';
    // Map status values to display text
    if (status === 'active' && enabled) return 'Active';
    if (status === 'disabled' || !enabled) return 'Inactive';
    if (status === 'pending') return 'Pending';
    if (status === 'failed') return 'Failed';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">File Sources</h2>
          <p className="text-muted-foreground">
            Configure and monitor file exchange connections
          </p>
        </div>
        <Button onClick={handleAddSource}>
          <Plus className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load file sources. Please try again.
          </p>
        </div>
      )}

      {!isLoading && !error && fileSources && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fileSources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No file sources configured</p>
                      <Button variant="outline" size="sm" onClick={handleAddSource}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add your first source
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                fileSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatSourceType(source.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{source.department}</TableCell>
                    <TableCell>
                      <Badge variant={source.direction === 'inward' ? 'default' : 'secondary'}>
                        {source.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={source.status === 'active' && source.enabled ? 'default' : 'secondary'}>
                        {formatStatus(source.status, source.enabled)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(source.last_sync)}
                    </TableCell>
                    <TableCell>
                      {source.success_rate !== null && source.success_rate !== undefined
                        ? `${typeof source.success_rate === 'string' ? parseFloat(source.success_rate).toFixed(1) : (source.success_rate * 100).toFixed(1)}%`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(source)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(String(source.id))}
                          title={source.status === 'active' && source.enabled ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditSource(source)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(String(source.id))}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <FileSourceSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        source={selectedSource}
      />

      <FileSourceDetailSheet
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        source={detailSource}
        onEdit={handleEditFromDetail}
      />
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConnectionTable } from '@/components/connections/ConnectionTable';
import { ConnectionSheet } from '@/components/connections/ConnectionSheet';
import { ConnectionHealthSheet } from '@/components/connections/ConnectionHealthSheet';
import {
  getConnections,
  deleteConnection,
  checkConnectionHealth,
} from '@/api/connections.api';
import { showSuccess, showError } from '@/lib/toast';
import type { SourceConnection } from '@/types';

export default function ConnectionsPage() {
  const [selectedConnection, setSelectedConnection] = useState<
    SourceConnection | undefined
  >();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isHealthSheetOpen, setIsHealthSheetOpen] = useState(false);
  const [healthConnection, setHealthConnection] = useState<SourceConnection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => getConnections(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      showSuccess('Connection deleted successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const healthCheckMutation = useMutation({
    mutationFn: (id: number) => checkConnectionHealth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      showSuccess('Connection health check completed');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleCreateNew = () => {
    setSelectedConnection(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (connection: SourceConnection) => {
    setSelectedConnection(connection);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleTestConnection = async (connection: SourceConnection) => {
    await healthCheckMutation.mutateAsync(connection.id);
  };

  const handleViewHealth = (connection: SourceConnection) => {
    setHealthConnection(connection);
    setIsHealthSheetOpen(true);
  };

  const handleSheetSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    setIsSheetOpen(false);
    showSuccess(
      selectedConnection
        ? 'Connection updated successfully'
        : 'Connection created successfully'
    );
  };

  // Filter connections
  const filteredConnections = connections.filter((connection) => {
    const matchesSearch =
      searchQuery === '' ||
      connection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connection.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || connection.type === typeFilter;

    const matchesStatus =
      statusFilter === 'all' || connection.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate summary stats
  const totalConnections = connections.length;
  const activeConnections = connections.filter((c) => c.status === 'active').length;
  const errorConnections = connections.filter((c) => c.status === 'error').length;
  const connectionTypes = connections.reduce((acc, conn) => {
    acc[conn.type] = (acc[conn.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">
            Manage your data source connections
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Connection
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="S3">S3</SelectItem>
            <SelectItem value="SFTP">SFTP</SelectItem>
            <SelectItem value="AZURE_BLOB">Azure Blob</SelectItem>
            <SelectItem value="GCS">Google Cloud Storage</SelectItem>
            <SelectItem value="FTP">FTP</SelectItem>
            <SelectItem value="FTPS">FTPS</SelectItem>
          </SelectContent>
        </Select>
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
      </div>

      {/* Table */}
      <ConnectionTable
        connections={filteredConnections}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTestConnection={handleTestConnection}
        onViewHealth={handleViewHealth}
        isLoading={isLoading}
      />

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Connections</div>
          <div className="text-2xl font-bold">{totalConnections}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold">{activeConnections}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Errors</div>
          <div className="text-2xl font-bold">{errorConnections}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Types</div>
          <div className="text-2xl font-bold">
            {Object.keys(connectionTypes).length}
          </div>
        </div>
      </div>

      {/* Connection Sheet */}
      <ConnectionSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        connection={selectedConnection}
        onSuccess={handleSheetSuccess}
      />

      {/* Health Details Sheet */}
      <ConnectionHealthSheet
        open={isHealthSheetOpen}
        onOpenChange={setIsHealthSheetOpen}
        connection={healthConnection}
      />
    </div>
  );
}

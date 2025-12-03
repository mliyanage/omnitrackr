import { useState } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  FlaskConical,
  Database,
  HardDrive,
  Cloud,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getConnectionStatusBadge } from '@/lib/badgeHelpers';
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
import type { SourceConnection } from '@/types';

interface ConnectionTableProps {
  connections: SourceConnection[];
  onEdit: (connection: SourceConnection) => void;
  onDelete: (id: number) => void;
  onTestConnection: (connection: SourceConnection) => void;
  onViewHealth: (connection: SourceConnection) => void;
  isLoading?: boolean;
}

export function ConnectionTable({
  connections,
  onEdit,
  onDelete,
  onTestConnection,
  onViewHealth,
  isLoading = false,
}: ConnectionTableProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'S3':
      case 'AZURE_BLOB':
      case 'GCS':
        return <Cloud className="h-4 w-4" />;
      case 'SFTP':
      case 'FTP':
      case 'FTPS':
        return <HardDrive className="h-4 w-4" />;
      case 'DATABASE':
        return <Database className="h-4 w-4" />;
      default:
        return <HardDrive className="h-4 w-4" />;
    }
  };

  const getConnectionConfig = (connection: SourceConnection): string => {
    const config = connection.connection_config;
    if ('bucket' in config && typeof config.bucket === 'string') {
      return config.bucket;
    }
    if ('host' in config && typeof config.host === 'string') {
      return config.host;
    }
    if ('container' in config && typeof config.container === 'string') {
      return config.container;
    }
    if ('account_name' in config && typeof config.account_name === 'string') {
      return config.account_name;
    }
    return 'N/A';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteClick = (id: number, name: string) => {
    setConnectionToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (connectionToDelete) {
      onDelete(connectionToDelete.id);
      setConnectionToDelete(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Config</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Checked</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                Loading connections...
              </TableCell>
            </TableRow>
          ) : connections.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-12 text-muted-foreground"
              >
                No connections found. Create your first connection to get started.
              </TableCell>
            </TableRow>
          ) : (
            connections.map((connection) => (
              <TableRow key={connection.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{connection.name}</div>
                    {connection.description && (
                      <div className="text-xs text-muted-foreground">
                        {connection.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getConnectionTypeIcon(connection.type)}
                    <span className="text-sm">{connection.type}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {getConnectionConfig(connection)}
                  </code>
                </TableCell>
                <TableCell>
                  {(() => {
                    const badge = getConnectionStatusBadge(connection.connection_status, connection.enabled);
                    return <Badge variant={badge.variant}>{badge.label}</Badge>;
                  })()}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(connection.last_health_check)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatDate(connection.created_at)}
                  </span>
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
                      <DropdownMenuItem onClick={() => onTestConnection(connection)}>
                        <FlaskConical className="mr-2 h-4 w-4" />
                        Test Connection
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewHealth(connection)}>
                        <Activity className="mr-2 h-4 w-4" />
                        View Health Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(connection)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(connection.id, connection.name)}
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

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Connection"
        description={`Are you sure you want to delete "${connectionToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

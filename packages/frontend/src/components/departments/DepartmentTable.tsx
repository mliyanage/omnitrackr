import { useState } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useHasRole } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';
import type { Department } from '@/types';

interface DepartmentTableProps {
  departments: Department[];
  onEdit: (department: Department) => void;
  onDelete: (id: number) => void;
  onToggleActive: (department: Department) => void;
  isLoading?: boolean;
}

export function DepartmentTable({
  departments,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading = false,
}: DepartmentTableProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const isOwnerOrAdmin = useHasRole('owner', 'super_admin');

  const handleDeleteClick = (id: number, name: string) => {
    setDepartmentToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (departmentToDelete) {
      onDelete(departmentToDelete.id);
      setDepartmentToDelete(null);
    }
  };

  // Sort departments by name
  const sortedDepartments = [...departments].sort((a, b) => a.name.localeCompare(b.name));

  const getStatusBadgeVariant = (status: string) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            {isOwnerOrAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={isOwnerOrAdmin ? 6 : 5} className="text-center py-12">
                Loading departments...
              </TableCell>
            </TableRow>
          ) : sortedDepartments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={isOwnerOrAdmin ? 6 : 5}
                className="text-center py-12 text-muted-foreground"
              >
                No departments found. Create your first department to get started.
              </TableCell>
            </TableRow>
          ) : (
            sortedDepartments.map((department) => (
              <TableRow key={department.id}>
                <TableCell>
                  <div className="font-medium">{department.name}</div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {department.code}
                  </code>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {department.description || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(department.status)}>
                    {department.status.charAt(0).toUpperCase() + department.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{formatDate(department.created_at)}</span>
                </TableCell>
                {isOwnerOrAdmin && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(department)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onToggleActive(department)}>
                          {department.status === 'active' ? (
                            <>
                              <ToggleLeft className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(department.id, department.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Department"
        description={`Are you sure you want to delete ${departmentToDelete?.name}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

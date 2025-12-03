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
import { getActiveStatusBadge } from '@/lib/badgeHelpers';
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
import type { RefData } from '@/types';

interface DepartmentTableProps {
  departments: RefData[];
  onEdit: (department: RefData) => void;
  onDelete: (id: number, code: string) => void;
  onToggleActive: (department: RefData) => void;
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
    code: string;
    name: string;
  } | null>(null);

  const isActive = (department: RefData): boolean => {
    return department.metadata?.is_active ?? true;
  };

  const getSortOrder = (department: RefData): number => {
    return department.metadata?.sort_order ?? 999;
  };

  const getDescription = (department: RefData): string => {
    return department.metadata?.description ?? '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteClick = (id: number, code: string, name: string) => {
    setDepartmentToDelete({ id, code, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (departmentToDelete) {
      onDelete(departmentToDelete.id, departmentToDelete.code);
      setDepartmentToDelete(null);
    }
  };

  // Sort departments by sort_order, then by name
  const sortedDepartments = [...departments].sort((a, b) => {
    const orderA = getSortOrder(a);
    const orderB = getSortOrder(b);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return (a.value1 || '').localeCompare(b.value1 || '');
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Abbreviation</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Sort Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                Loading departments...
              </TableCell>
            </TableRow>
          ) : sortedDepartments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-12 text-muted-foreground"
              >
                No departments found. Create your first department to get started.
              </TableCell>
            </TableRow>
          ) : (
            sortedDepartments.map((department) => (
              <TableRow key={department.id}>
                <TableCell>
                  <div className="font-medium">{department.value1}</div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {department.value2 || 'N/A'}
                  </code>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {getDescription(department) || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{getSortOrder(department)}</span>
                </TableCell>
                <TableCell>
                  {(() => {
                    const badge = getActiveStatusBadge(isActive(department));
                    return <Badge variant={badge.variant}>{badge.label}</Badge>;
                  })()}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatDate(department.created_at)}
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
                      <DropdownMenuItem onClick={() => onEdit(department)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onToggleActive(department)}>
                        {isActive(department) ? (
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
                        onClick={() =>
                          handleDeleteClick(
                            department.id,
                            department.code,
                            department.value1 || 'this department'
                          )
                        }
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

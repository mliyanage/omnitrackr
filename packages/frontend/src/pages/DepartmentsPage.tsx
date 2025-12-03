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
import { DepartmentTable } from '@/components/departments/DepartmentTable';
import { DepartmentSheet } from '@/components/departments/DepartmentSheet';
import {
  getDepartments,
  deleteRefData,
  updateRefData,
} from '@/api/refData.api';
import { showSuccess, showError } from '@/lib/toast';
import type { RefData } from '@/types';

export default function DepartmentsPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<RefData | undefined>();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => getDepartments(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRefData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      showSuccess('Department deleted successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: { metadata: Record<string, unknown> } }) =>
      updateRefData(code, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      const isActive = (variables.data.metadata as { is_active?: boolean })?.is_active;
      showSuccess(
        `Department ${isActive ? 'activated' : 'deactivated'} successfully`
      );
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleCreateNew = () => {
    setSelectedDepartment(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (department: RefData) => {
    setSelectedDepartment(department);
    setIsSheetOpen(true);
  };

  const handleDelete = async (_id: number, code: string) => {
    await deleteMutation.mutateAsync(code);
  };

  const handleToggleActive = async (department: RefData) => {
    const currentMetadata = department.metadata || {};
    const isCurrentlyActive = (currentMetadata as { is_active?: boolean })?.is_active ?? true;
    await updateMutation.mutateAsync({
      code: department.code,
      data: {
        metadata: {
          ...currentMetadata,
          is_active: !isCurrentlyActive,
        },
      },
    });
  };

  const handleSheetSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['departments'] });
    setIsSheetOpen(false);
    showSuccess(
      selectedDepartment
        ? 'Department updated successfully'
        : 'Department created successfully'
    );
  };

  // Filter departments
  const filteredDepartments = departments.filter((department) => {
    const metadata = department.metadata as { description?: string; is_active?: boolean } | null | undefined;
    const matchesSearch =
      searchQuery === '' ||
      department.value1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      department.value2?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const isActive = metadata?.is_active ?? true;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);

    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter((d) => {
    const metadata = d.metadata as { is_active?: boolean } | null | undefined;
    return metadata?.is_active ?? true;
  }).length;
  const inactiveDepartments = totalDepartments - activeDepartments;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            Manage organizational departments and teams
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Department
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search departments..."
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
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DepartmentTable
        departments={filteredDepartments}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        isLoading={isLoading}
      />

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Departments</div>
          <div className="text-2xl font-bold">{totalDepartments}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold">{activeDepartments}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Inactive</div>
          <div className="text-2xl font-bold">{inactiveDepartments}</div>
        </div>
      </div>

      {/* Department Sheet */}
      <DepartmentSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        department={selectedDepartment}
        onSuccess={handleSheetSuccess}
      />
    </div>
  );
}

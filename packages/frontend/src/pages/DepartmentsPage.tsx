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
import { listDepartments, deleteDepartment, updateDepartment } from '@/api/departments.api';
import { showSuccess, showError } from '@/lib/toast';
import { useHasRole } from '@/stores/authStore';
import type { Department } from '@/types';

export default function DepartmentsPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | undefined>();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();
  const isOwnerOrAdmin = useHasRole('owner', 'super_admin');

  // Fetch departments
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    select: (response) => response.data || [],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      showSuccess('Department deleted successfully');
    },
    onError: showError,
  });

  // Update mutation (for toggling status)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      showSuccess('Department updated successfully');
    },
    onError: showError,
  });

  const handleCreateNew = () => {
    setSelectedDepartment(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this department?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggleActive = async (department: Department) => {
    const newStatus = department.status === 'active' ? 'inactive' : 'active';
    await updateMutation.mutateAsync({
      id: department.id,
      data: { status: newStatus },
    });
  };

  const handleSheetSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['departments'] });
    setIsSheetOpen(false);
    showSuccess(
      selectedDepartment ? 'Department updated successfully' : 'Department created successfully'
    );
  };

  // Filter departments
  const filteredDepartments = departments.filter((department) => {
    const matchesSearch =
      searchQuery === '' ||
      department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      department.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      department.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && department.status === 'active') ||
      (statusFilter === 'inactive' && department.status === 'inactive');

    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter((d) => d.status === 'active').length;
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
        {isOwnerOrAdmin && (
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create Department
          </Button>
        )}
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

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
import { ScheduleTable } from '@/components/schedules/ScheduleTable';
import { ScheduleSheet } from '@/components/schedules/ScheduleSheet';
import {
  getSchedules,
  deleteSchedule,
  updateSchedule,
} from '@/api/schedules.api';
import { showSuccess, showError } from '@/lib/toast';
import type { Schedule } from '@/types';

export default function SchedulesPage() {
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | undefined>();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => getSchedules(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      showSuccess('Schedule deleted successfully');
    },
    onError: (error) => {
      showError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { enabled: boolean } }) =>
      updateSchedule(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      showSuccess(
        `Schedule ${variables.data.enabled ? 'enabled' : 'disabled'} successfully`
      );
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleCreateNew = () => {
    setSelectedSchedule(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleToggleEnabled = async (schedule: Schedule) => {
    await updateMutation.mutateAsync({
      id: schedule.id,
      data: { enabled: !schedule.enabled },
    });
  };

  const handleSheetSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    setIsSheetOpen(false);
    showSuccess(
      selectedSchedule
        ? 'Schedule updated successfully'
        : 'Schedule created successfully'
    );
  };

  // Filter schedules
  const filteredSchedules = schedules.filter((schedule) => {
    const matchesSearch =
      searchQuery === '' ||
      schedule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFrequency =
      frequencyFilter === 'all' || schedule.frequency_type === frequencyFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'enabled' && schedule.enabled) ||
      (statusFilter === 'disabled' && !schedule.enabled);

    return matchesSearch && matchesFrequency && matchesStatus;
  });

  // Calculate summary stats
  const totalSchedules = schedules.length;
  const enabledSchedules = schedules.filter((s) => s.enabled).length;
  const frequencyBreakdown = schedules.reduce((acc, schedule) => {
    acc[schedule.frequency_type] = (acc[schedule.frequency_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
          <p className="text-muted-foreground">
            Manage your polling schedules and execution times
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Schedule
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search schedules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frequencies</SelectItem>
            <SelectItem value="minutely">Minutely</SelectItem>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ScheduleTable
        schedules={filteredSchedules}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleEnabled={handleToggleEnabled}
        isLoading={isLoading}
      />

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Schedules</div>
          <div className="text-2xl font-bold">{totalSchedules}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Enabled</div>
          <div className="text-2xl font-bold">{enabledSchedules}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Disabled</div>
          <div className="text-2xl font-bold">{totalSchedules - enabledSchedules}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Frequency Types</div>
          <div className="text-2xl font-bold">
            {Object.keys(frequencyBreakdown).length}
          </div>
        </div>
      </div>

      {/* Schedule Sheet */}
      <ScheduleSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        schedule={selectedSchedule}
        onSuccess={handleSheetSuccess}
      />
    </div>
  );
}

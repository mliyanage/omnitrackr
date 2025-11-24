import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConnectionCombobox } from './ConnectionCombobox';
import { ScheduleCombobox } from './ScheduleCombobox';
import { DepartmentCombobox } from './DepartmentCombobox';
import { ConnectionSheet } from './ConnectionSheet';
import { ScheduleSheet } from './ScheduleSheet';
import { DepartmentSheet } from './DepartmentSheet';
import { createWatcher, updateWatcher } from '@/api/watchers.api';
import type { Watcher, SourceConnection, Schedule, RefData } from '@/types';

const watcherFormSchema = z.object({
  name: z.string().min(1, 'Watcher name is required'),
  description: z.string().optional(),
  source_connection_id: z.number().min(1, 'Connection is required'),
  schedule_id: z.number().min(1, 'Schedule is required'),
  department_id: z.number().min(1, 'Department is required'),
  file_name_pattern: z.string().optional(),
  path_pattern: z.string().optional(),
  match_rule: z.enum(['exact', 'partial', 'regex']),
  direction: z.enum(['inward', 'outward', 'bidirectional']),
  sla_enabled: z.boolean().default(false),
  sla_threshold_minutes: z.coerce.number().int().min(1).optional().nullable(),
});

type WatcherFormValues = z.infer<typeof watcherFormSchema>;

interface WatcherFormProps {
  watcher?: Watcher;
  onSuccess: (watcher: Watcher) => void;
  onCancel: () => void;
}

export function WatcherForm({ watcher, onSuccess, onCancel }: WatcherFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!watcher;

  // Nested sheet state
  const [isConnectionSheetOpen, setIsConnectionSheetOpen] = useState(false);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [isDepartmentSheetOpen, setIsDepartmentSheetOpen] = useState(false);

  const form = useForm<WatcherFormValues>({
    resolver: zodResolver(watcherFormSchema),
    defaultValues: watcher
      ? {
          name: watcher.name,
          description: watcher.description || '',
          source_connection_id: watcher.source_connection_id,
          schedule_id: watcher.schedule_id,
          department_id: watcher.department_id,
          file_name_pattern: watcher.file_name_pattern || '',
          path_pattern: watcher.path_pattern || '',
          match_rule: watcher.match_rule,
          direction: watcher.direction,
          sla_enabled: watcher.sla_enabled,
          sla_threshold_minutes: watcher.sla_threshold_minutes,
        }
      : {
          name: '',
          description: '',
          source_connection_id: 0,
          schedule_id: 0,
          department_id: 0,
          file_name_pattern: '',
          path_pattern: '',
          match_rule: 'partial',
          direction: 'inward',
          sla_enabled: false,
          sla_threshold_minutes: 60,
        },
  });

  const slaEnabled = form.watch('sla_enabled');

  const createMutation = useMutation({
    mutationFn: createWatcher,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['watchers'] });
      onSuccess(data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateWatcher(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['watchers'] });
      onSuccess(data);
    },
  });

  const onSubmit = (data: WatcherFormValues) => {
    // Clean up data
    const cleanedData = {
      ...data,
      sla_threshold_minutes: data.sla_enabled && data.sla_threshold_minutes !== null ? data.sla_threshold_minutes : undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: watcher.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleConnectionCreated = (connection: SourceConnection) => {
    form.setValue('source_connection_id', connection.id);
    queryClient.invalidateQueries({ queryKey: ['connections'] });
  };

  const handleScheduleCreated = (schedule: Schedule) => {
    form.setValue('schedule_id', schedule.id);
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
  };

  const handleDepartmentCreated = (department: RefData) => {
    form.setValue('department_id', department.id);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Configure the basic watcher details and connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Watcher Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Daily Invoice Files" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of what this watcher monitors"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source_connection_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Connection</FormLabel>
                    <FormControl>
                      <ConnectionCombobox
                        value={field.value || undefined}
                        onChange={field.onChange}
                        onCreateNew={() => setIsConnectionSheetOpen(true)}
                      />
                    </FormControl>
                    <FormDescription>
                      Select the data source to monitor or create a new connection
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schedule_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule</FormLabel>
                    <FormControl>
                      <ScheduleCombobox
                        value={field.value || undefined}
                        onChange={field.onChange}
                        onCreateNew={() => setIsScheduleSheetOpen(true)}
                      />
                    </FormControl>
                    <FormDescription>
                      Select when this watcher should run or create a new schedule
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <DepartmentCombobox
                        value={field.value || undefined}
                        onChange={field.onChange}
                        onCreateNew={() => setIsDepartmentSheetOpen(true)}
                      />
                    </FormControl>
                    <FormDescription>
                      Business unit or team responsible for this watcher
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="space-y-6 rounded-lg border p-6 bg-muted/30">
            <div className="space-y-2">
              <h3 className="text-base font-semibold leading-none">File Pattern Matching</h3>
              <p className="text-sm text-muted-foreground">
                Configure how files should be identified and matched
              </p>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="file_name_pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Name Pattern (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="invoice_*.csv" 
                        {...field}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Pattern to match file names (use * for wildcards)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="path_pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Path Pattern (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="/incoming/2024/*" 
                        {...field}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Pattern to match file paths
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="match_rule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Rule</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={form.formState.errors.match_rule ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select match rule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="exact">Exact Match</SelectItem>
                          <SelectItem value="partial">Partial Match (Wildcard)</SelectItem>
                          <SelectItem value="regex">Regular Expression</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={form.formState.errors.direction ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inward">Inward</SelectItem>
                          <SelectItem value="outward">Outward</SelectItem>
                          <SelectItem value="bidirectional">Bidirectional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-lg border p-6 bg-muted/30">
            <div className="space-y-2">
              <h3 className="text-base font-semibold leading-none">SLA Monitoring</h3>
              <p className="text-sm text-muted-foreground">
                Set up alerts for missing or delayed files
              </p>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="sla_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">Enable SLA Monitoring</FormLabel>
                      <FormDescription>
                        Track expected file arrivals and alert on missing files
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {slaEnabled && (
                <FormField
                  control={form.control}
                  name="sla_threshold_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SLA Threshold (Minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="60"
                          {...field}
                          value={field.value || ''}
                          className="max-w-[200px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Time allowed after expected arrival before alerting
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {(error as any).response?.data?.error?.message || 'An error occurred'}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Watcher' : 'Create Watcher'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Nested Sheets - These appear on top of the parent WatcherSheet */}
      <ConnectionSheet
        open={isConnectionSheetOpen}
        onOpenChange={setIsConnectionSheetOpen}
        onSuccess={handleConnectionCreated}
      />

      <ScheduleSheet
        open={isScheduleSheetOpen}
        onOpenChange={setIsScheduleSheetOpen}
        onSuccess={handleScheduleCreated}
      />

      <DepartmentSheet
        open={isDepartmentSheetOpen}
        onOpenChange={setIsDepartmentSheetOpen}
        onSuccess={handleDepartmentCreated}
      />
    </>
  );
}

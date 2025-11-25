import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, Plus, X } from 'lucide-react';
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
import { createSchedule, updateSchedule } from '@/api/schedules.api';
import { getTimezones } from '@/api/refData.api';
import type { Schedule, DayOfWeek, WeekOfMonth } from '@/types';
import { useState } from 'react';

const scheduleFormSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  frequency_type: z.enum(['minutely', 'hourly', 'daily', 'weekly', 'monthly', 'yearly']),
  frequency_interval: z.coerce.number().int().min(1, 'Interval must be at least 1'),
  execution_times: z.array(z.string()).optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  days_of_week: z.array(z.string()).optional(),
  day_of_month: z.coerce.number().int().refine((val) => val === null || val === undefined || val === -1 || (val >= 1 && val <= 31), {
    message: "Must be 1-31 or -1 for last day of month"
  }).optional().nullable(),
  week_of_month: z.enum(['first', 'second', 'third', 'fourth', 'last']).optional().nullable(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEK_OF_MONTH_OPTIONS: { value: WeekOfMonth; label: string }[] = [
  { value: 'first', label: '1st' },
  { value: 'second', label: '2nd' },
  { value: 'third', label: '3rd' },
  { value: 'fourth', label: '4th' },
  { value: 'last', label: 'Last' },
];

interface ScheduleFormProps {
  schedule?: Schedule;
  onSuccess: (schedule: Schedule) => void;
  onCancel: () => void;
}

export function ScheduleForm({ schedule, onSuccess, onCancel }: ScheduleFormProps) {
  const queryClient = useQueryClient();
  const [newExecutionTime, setNewExecutionTime] = useState('');

  const isEditing = !!schedule;

  const { data: timezones = [] } = useQuery({
    queryKey: ['timezones'],
    queryFn: getTimezones,
  });

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: schedule
      ? {
          name: schedule.name,
          description: schedule.description || '',
          enabled: schedule.enabled,
          frequency_type: schedule.frequency_type,
          frequency_interval: schedule.frequency_interval,
          execution_times: schedule.execution_times || [],
          timezone: schedule.timezone,
          days_of_week: schedule.days_of_week || [],
          day_of_month: schedule.day_of_month,
          week_of_month: schedule.week_of_month,
          start_date: schedule.start_date || '',
          end_date: schedule.end_date || '',
        }
      : {
          name: '',
          description: '',
          enabled: true,
          frequency_type: 'daily',
          frequency_interval: 1,
          execution_times: [],
          timezone: 'America/New_York',
          days_of_week: [],
          day_of_month: null,
          week_of_month: null,
          start_date: '',
          end_date: '',
        },
  });

  const frequencyType = form.watch('frequency_type');
  const executionTimes = form.watch('execution_times') || [];
  const selectedDaysOfWeek = form.watch('days_of_week') || [];

  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      onSuccess(data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateSchedule(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      onSuccess(data);
    },
  });

  const onSubmit = (data: ScheduleFormValues) => {
    // Clean up data based on frequency type
    const cleanedData = {
      ...data,
      execution_times: ['daily', 'weekly', 'monthly', 'yearly'].includes(data.frequency_type)
        ? data.execution_times
        : undefined,
      days_of_week: data.frequency_type === 'weekly' ? data.days_of_week : undefined,
      day_of_month:
        data.frequency_type === 'monthly' && !data.week_of_month
          ? data.day_of_month
          : undefined,
      week_of_month:
        data.frequency_type === 'monthly' && data.days_of_week && data.days_of_week.length > 0
          ? data.week_of_month
          : undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: schedule.id, data: cleanedData as any });
    } else {
      createMutation.mutate(cleanedData as any);
    }
  };

  const handleAddExecutionTime = () => {
    if (newExecutionTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newExecutionTime)) {
      const currentTimes = form.getValues('execution_times') || [];
      if (!currentTimes.includes(newExecutionTime)) {
        form.setValue('execution_times', [...currentTimes, newExecutionTime].sort());
      }
      setNewExecutionTime('');
    }
  };

  const handleRemoveExecutionTime = (time: string) => {
    const currentTimes = form.getValues('execution_times') || [];
    form.setValue(
      'execution_times',
      currentTimes.filter((t) => t !== time)
    );
  };

  const handleToggleDayOfWeek = (day: DayOfWeek) => {
    const current = form.getValues('days_of_week') || [];
    if (current.includes(day)) {
      form.setValue(
        'days_of_week',
        current.filter((d) => d !== day)
      );
    } else {
      form.setValue('days_of_week', [...current, day]);
    }
  };

  const renderFrequencySpecificFields = () => {
    switch (frequencyType) {
      case 'weekly':
        return (
          <FormItem>
            <FormLabel>Days of Week</FormLabel>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={selectedDaysOfWeek.includes(day) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleToggleDayOfWeek(day)}
                  className="text-xs"
                >
                  {day.substring(0, 3)}
                </Button>
              ))}
            </div>
            <FormDescription>Select the days when the schedule should run</FormDescription>
          </FormItem>
        );

      case 'monthly':
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="week_of_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Week of Month (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None - use day of month instead" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {WEEK_OF_MONTH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a week to run on specific weekday (e.g., "2nd Tuesday"). Leave empty to use a specific day number below.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('week_of_month') ? (
              <FormItem>
                <FormLabel>Day of Week</FormLabel>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={selectedDaysOfWeek.includes(day) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleDayOfWeek(day)}
                      className="text-xs"
                    >
                      {day.substring(0, 3)}
                    </Button>
                  ))}
                </div>
              </FormItem>
            ) : (
              <FormField
                control={form.control}
                name="day_of_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Month</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value, 10))}
                      value={field.value?.toString() || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                        <SelectItem value="-1">Last day of month</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a specific day (1-31) or last day of month
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const shouldShowExecutionTimes = ['daily', 'weekly', 'monthly', 'yearly'].includes(
    frequencyType
  );

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Details</CardTitle>
            <CardDescription>
              Configure the basic schedule information and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Daily Morning Check" {...field} />
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
                      placeholder="Brief description of this schedule"
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
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">Enabled</FormLabel>
                    <FormDescription>
                      Schedule will only run if enabled
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frequency Configuration</CardTitle>
            <CardDescription>
              Configure when and how often the schedule should run
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="minutely">Minutely</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency_interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      {frequencyType === 'minutely' && 'Every N minutes'}
                      {frequencyType === 'hourly' && 'Every N hours'}
                      {frequencyType === 'daily' && 'Every N days'}
                      {frequencyType === 'weekly' && 'Every N weeks'}
                      {frequencyType === 'monthly' && 'Every N months'}
                      {frequencyType === 'yearly' && 'Every N years'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {renderFrequencySpecificFields()}
          </CardContent>
        </Card>

        {shouldShowExecutionTimes && (
          <div className="space-y-4 rounded-lg border p-6 bg-muted/30">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold leading-none">Execution Times</h4>
              <p className="text-xs text-muted-foreground">
                Specific times of day when the schedule should run (24-hour format)
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newExecutionTime}
                  onChange={(e) => setNewExecutionTime(e.target.value)}
                  placeholder="HH:MM"
                  className="max-w-[140px]"
                />
                <Button 
                  type="button" 
                  onClick={handleAddExecutionTime} 
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Time
                </Button>
              </div>
              {executionTimes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {executionTimes.map((time) => (
                    <div
                      key={time}
                      className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm"
                    >
                      <span className="font-mono">{time}</span>
                      <Button
                        type="button"
                        onClick={() => handleRemoveExecutionTime(time)}
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Schedule Settings</CardTitle>
            <CardDescription>
              Configure timezone and schedule validity period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {timezones.length > 0 ? (
                        timezones.map((tz) => (
                          <SelectItem key={tz.id} value={tz.value1 || ''}>
                            {tz.value1} ({tz.value2})
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                          <SelectItem value="America/Denver">America/Denver (MST)</SelectItem>
                          <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                          <SelectItem value="America/Anchorage">America/Anchorage (AKST)</SelectItem>
                          <SelectItem value="Pacific/Honolulu">Pacific/Honolulu (HST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                          <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                          <SelectItem value="Europe/Athens">Europe/Athens (EET)</SelectItem>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                          <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                          <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                          <SelectItem value="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>When schedule becomes active</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>When schedule expires</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

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
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

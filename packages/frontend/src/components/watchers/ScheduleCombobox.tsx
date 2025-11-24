import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getSchedules } from '@/api/schedules.api';
import type { Schedule } from '@/types';

interface ScheduleComboboxProps {
  value?: number;
  onChange: (value: number) => void;
  onCreateNew: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ScheduleCombobox({
  value,
  onChange,
  onCreateNew,
  disabled = false,
  placeholder = 'Select schedule...',
  className,
}: ScheduleComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: getSchedules,
  });

  const selectedSchedule = schedules.find((sched) => sched.id === value);

  const filteredSchedules = schedules.filter((sched) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      sched.name.toLowerCase().includes(searchLower) ||
      sched.frequency_type.toLowerCase().includes(searchLower) ||
      sched.description?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (scheduleId: number) => {
    onChange(scheduleId);
    setOpen(false);
    setSearchQuery('');
  };

  const handleCreateNew = () => {
    setOpen(false);
    setSearchQuery('');
    onCreateNew();
  };

  const formatScheduleDescription = (schedule: Schedule): string => {
    const freq = schedule.frequency_type.charAt(0).toUpperCase() + schedule.frequency_type.slice(1);
    const interval = schedule.frequency_interval > 1 ? `Every ${schedule.frequency_interval} ` : '';
    return `${interval}${freq}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          {selectedSchedule ? (
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedSchedule.name}</span>
              <span className="text-xs text-muted-foreground">
                ({formatScheduleDescription(selectedSchedule)})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search schedules..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px] overflow-y-auto [&>div]:overflow-y-auto">
            <CommandEmpty>
              {isLoading ? (
                <div className="py-6 text-center text-sm">Loading...</div>
              ) : (
                <div className="py-6 text-center text-sm">
                  No schedules found.
                </div>
              )}
            </CommandEmpty>
            {filteredSchedules.length > 0 && (
              <CommandGroup heading="Schedules">
                {filteredSchedules.map((schedule) => (
                  <CommandItem
                    key={schedule.id}
                    value={schedule.id.toString()}
                    onSelect={() => handleSelect(schedule.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === schedule.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{schedule.name}</span>
                          {!schedule.enabled && (
                            <span className="text-xs text-muted-foreground italic">
                              (disabled)
                            </span>
                          )}
                        </div>
                        {schedule.description && (
                          <div className="text-xs text-muted-foreground">
                            {schedule.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatScheduleDescription(schedule)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleCreateNew} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                <span className="font-medium">Create new schedule</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

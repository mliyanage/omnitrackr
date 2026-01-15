import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface WatcherOption {
  id: number;
  name: string;
  department_code?: string;
}

interface WatcherComboboxProps {
  watchers: WatcherOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function WatcherCombobox({
  watchers,
  value,
  onValueChange,
  placeholder = 'Select watcher...',
  className,
  disabled = false,
}: WatcherComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedWatcher = watchers.find((watcher) => watcher.id.toString() === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full md:w-[200px] justify-between', className)}
        >
          {value === 'all'
            ? 'All Watchers'
            : selectedWatcher
              ? `${selectedWatcher.name}${selectedWatcher.department_code ? ` (${selectedWatcher.department_code})` : ''}`
              : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search watchers..." />
          <CommandList>
            <CommandEmpty>No watcher found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onValueChange('all');
                  setOpen(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === 'all' ? 'opacity-100' : 'opacity-0')} />
                All Watchers
              </CommandItem>
              {watchers.map((watcher) => (
                <CommandItem
                  key={watcher.id}
                  value={watcher.name}
                  onSelect={() => {
                    onValueChange(watcher.id.toString());
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === watcher.id.toString() ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>
                    {watcher.name}
                    {watcher.department_code && (
                      <span className="text-muted-foreground ml-1">({watcher.department_code})</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

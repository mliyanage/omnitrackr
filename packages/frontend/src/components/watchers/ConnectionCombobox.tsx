import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
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
import { getConnections } from '@/api/connections.api';
import type { SourceConnection } from '@/types';

interface ConnectionComboboxProps {
  value?: number;
  onChange: (value: number) => void;
  onCreateNew: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ConnectionCombobox({
  value,
  onChange,
  onCreateNew,
  disabled = false,
  placeholder = 'Select connection...',
  className,
}: ConnectionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: getConnections,
  });

  const selectedConnection = connections.find((conn) => conn.id === value);

  const filteredConnections = connections.filter((conn) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conn.name.toLowerCase().includes(searchLower) ||
      conn.type.toLowerCase().includes(searchLower) ||
      conn.description?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (connectionId: number) => {
    onChange(connectionId);
    setOpen(false);
    setSearchQuery('');
  };

  const handleCreateNew = () => {
    setOpen(false);
    setSearchQuery('');
    onCreateNew();
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
          {selectedConnection ? (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selectedConnection.name}</span>
              <span className="text-xs text-muted-foreground">
                ({selectedConnection.type})
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
            placeholder="Search connections..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px] overflow-y-auto [&>div]:overflow-y-auto">
            <CommandEmpty>
              {isLoading ? (
                <div className="py-6 text-center text-sm">Loading...</div>
              ) : (
                <div className="py-6 text-center text-sm">
                  No connections found.
                </div>
              )}
            </CommandEmpty>
            {filteredConnections.length > 0 && (
              <CommandGroup heading="Connections">
                {filteredConnections.map((connection) => (
                  <CommandItem
                    key={connection.id}
                    value={connection.id.toString()}
                    onSelect={() => handleSelect(connection.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === connection.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div>
                        <div className="font-medium">{connection.name}</div>
                        {connection.description && (
                          <div className="text-xs text-muted-foreground">
                            {connection.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {connection.type}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleCreateNew} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                <span className="font-medium">Create new connection</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

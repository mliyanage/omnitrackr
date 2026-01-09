import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { listDepartments } from '@/api/departments.api';

interface DepartmentMultiSelectProps {
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DepartmentMultiSelect({
  value = [],
  onChange,
  disabled = false,
  placeholder = 'Select departments...',
  className,
}: DepartmentMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    select: (response) => response.data || [],
  });

  // Only show active departments
  const activeDepartments = departments.filter((dept) => dept.status === 'active');

  const selectedDepartments = activeDepartments.filter((dept) => value.includes(dept.id));

  const filteredDepartments = activeDepartments.filter((dept) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      dept.name?.toLowerCase().includes(searchLower) ||
      dept.code?.toLowerCase().includes(searchLower) ||
      dept.description?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (departmentId: number) => {
    const newValue = value.includes(departmentId)
      ? value.filter((id) => id !== departmentId)
      : [...value, departmentId];
    onChange(newValue);
  };

  const handleRemove = (departmentId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(value.filter((id) => id !== departmentId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between h-auto min-h-[40px]', className)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedDepartments.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedDepartments.map((dept) => (
                <Badge key={dept.id} variant="secondary" className="gap-1">
                  {dept.name}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(dept.id, e)}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search departments..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {isLoading ? (
                <div className="py-6 text-center text-sm">Loading...</div>
              ) : (
                <div className="py-6 text-center text-sm">No departments found.</div>
              )}
            </CommandEmpty>
            {filteredDepartments.length > 0 && (
              <CommandGroup heading="Departments">
                {filteredDepartments.map((department) => {
                  const isSelected = value.includes(department.id);
                  return (
                    <CommandItem
                      key={department.id}
                      value={department.code}
                      onSelect={() => handleSelect(department.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{department.name}</div>
                        {department.description && (
                          <div className="text-xs text-muted-foreground">
                            {department.description}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-2 font-mono text-xs">
                        {department.code}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

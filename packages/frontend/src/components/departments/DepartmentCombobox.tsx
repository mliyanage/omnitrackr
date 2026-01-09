import { useState } from 'react';
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
import { listDepartments } from '@/api/departments.api';

interface DepartmentComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  onCreateNew: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DepartmentCombobox({
  value,
  onChange,
  onCreateNew,
  disabled = false,
  placeholder = 'Select department...',
  className,
}: DepartmentComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    select: (response) => response.data || [],
  });

  // Only show active departments
  const activeDepartments = departments.filter((dept) => dept.status === 'active');

  const selectedDepartment = activeDepartments.find((dept) => dept.code === value);

  const filteredDepartments = activeDepartments.filter((dept) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      dept.name?.toLowerCase().includes(searchLower) ||
      dept.code?.toLowerCase().includes(searchLower) ||
      dept.description?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (departmentCode: string) => {
    onChange(departmentCode);
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
          {selectedDepartment ? (
            <span className="font-medium">{selectedDepartment.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search departments..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px] overflow-y-auto [&>div]:overflow-y-auto">
            <CommandEmpty>
              {isLoading ? (
                <div className="py-6 text-center text-sm">Loading...</div>
              ) : (
                <div className="py-6 text-center text-sm">
                  No departments found.
                </div>
              )}
            </CommandEmpty>
            {filteredDepartments.length > 0 && (
              <CommandGroup heading="Departments">
                {filteredDepartments.map((department) => {
                  return (
                    <CommandItem
                      key={department.id}
                      value={department.code}
                      onSelect={() => handleSelect(department.code)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === department.code ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div>
                        <div className="font-medium">{department.name}</div>
                        {department.description && (
                          <div className="text-xs text-muted-foreground">
                            {department.description}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleCreateNew} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                <span className="font-medium">Create new department</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

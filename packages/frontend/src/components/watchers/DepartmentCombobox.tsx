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
import { getDepartments } from '@/api/refData.api';

interface DepartmentComboboxProps {
  value?: number;
  onChange: (value: number) => void;
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
    queryFn: getDepartments,
  });

  // Only show active departments
  const activeDepartments = departments.filter(
    (dept) => (dept.metadata as any)?.is_active !== false
  );

  const selectedDepartment = activeDepartments.find((dept) => dept.id === value);

  const filteredDepartments = activeDepartments.filter((dept) => {
    const searchLower = searchQuery.toLowerCase();
    const description = (dept.metadata as any)?.description || '';
    return (
      dept.value1?.toLowerCase().includes(searchLower) ||
      dept.value2?.toLowerCase().includes(searchLower) ||
      description.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (departmentId: number) => {
    onChange(departmentId);
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
            <span className="font-medium">{selectedDepartment.value1}</span>
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
                {filteredDepartments.map((department) => (
                  <CommandItem
                    key={department.id}
                    value={department.id.toString()}
                    onSelect={() => handleSelect(department.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === department.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div>
                      <div className="font-medium">{department.value1}</div>
                      {(department.metadata as any)?.description && (
                        <div className="text-xs text-muted-foreground">
                          {(department.metadata as any).description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
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

import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface Department {
  code: string;
  name: string;
}

interface DepartmentMultiSelectProps {
  departments: Department[];
  selectedDepartments: string[];
  onChange: (selected: string[]) => void;
}

export function DepartmentMultiSelect({
  departments,
  selectedDepartments,
  onChange,
}: DepartmentMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelectAll = () => {
    if (selectedDepartments.length === departments.length) {
      onChange([]);
    } else {
      onChange(departments.map((d) => d.code));
    }
  };

  const handleToggleDepartment = (code: string) => {
    const newSelected = selectedDepartments.includes(code)
      ? selectedDepartments.filter((c) => c !== code)
      : [...selectedDepartments, code];
    onChange(newSelected);
  };

  const getDisplayText = () => {
    if (selectedDepartments.length === 0 || selectedDepartments.length === departments.length) {
      return 'All Departments';
    }
    if (selectedDepartments.length === 1) {
      const dept = departments.find((d) => d.code === selectedDepartments[0]);
      return dept?.name || selectedDepartments[0];
    }
    return `${selectedDepartments.length} selected`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[200px] justify-between"
        >
          {getDisplayText()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-2">
          <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer">
            <Checkbox
              id="select-all"
              checked={selectedDepartments.length === departments.length}
              onCheckedChange={handleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
            >
              Select All
            </label>
          </div>
          <div className="h-px bg-border my-2" />
          {departments.map((dept) => (
            <div
              key={dept.code}
              className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
            >
              <Checkbox
                id={dept.code}
                checked={selectedDepartments.includes(dept.code)}
                onCheckedChange={() => handleToggleDepartment(dept.code)}
              />
              <label
                htmlFor={dept.code}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
              >
                {dept.name}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

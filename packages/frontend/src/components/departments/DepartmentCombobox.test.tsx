import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/__tests__/utils/test-utils';
import { DepartmentCombobox } from './DepartmentCombobox';
import { mockDepartments } from '@/__tests__/utils/mockData';

describe('DepartmentCombobox - Simplified Tests', () => {
  const mockOnChange = vi.fn();
  const mockOnCreateNew = vi.fn();

  it('renders without crashing', () => {
    render(
      <DepartmentCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays default placeholder', () => {
    render(
      <DepartmentCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Select department...');
  });

  it('displays custom placeholder when provided', () => {
    render(
      <DepartmentCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
        placeholder="Choose a department"
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Choose a department');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <DepartmentCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
        disabled={true}
      />
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('accepts value and onChange props', () => {
    render(
      <DepartmentCombobox
        value={mockDepartments[0].code}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('accepts onCreateNew callback', () => {
    render(
      <DepartmentCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

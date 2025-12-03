import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/__tests__/utils/test-utils';
import { DepartmentSheet } from './DepartmentSheet';
import { mockDepartment } from '@/__tests__/utils/mockData';

// Mock the DepartmentForm component
vi.mock('./DepartmentForm', () => ({
  DepartmentForm: ({ department }: { department?: any }) => (
    <div data-testid="department-form">
      {department && <div data-testid="editing">Editing</div>}
    </div>
  ),
}));

describe('DepartmentSheet - Simplified Tests', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  it('renders nothing when closed', () => {
    render(
      <DepartmentSheet
        open={false}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByTestId('department-form')).not.toBeInTheDocument();
  });

  it('renders sheet when open', () => {
    render(
      <DepartmentSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByTestId('department-form')).toBeInTheDocument();
  });

  it('shows create title in create mode', () => {
    render(
      <DepartmentSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create New Department')).toBeInTheDocument();
  });

  it('shows edit title in edit mode', () => {
    render(
      <DepartmentSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        department={mockDepartment}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Edit Department')).toBeInTheDocument();
  });

  it('passes department data to form in edit mode', () => {
    render(
      <DepartmentSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        department={mockDepartment}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByTestId('editing')).toBeInTheDocument();
  });
});

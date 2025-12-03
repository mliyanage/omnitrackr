import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/__tests__/utils/test-utils';
import { DepartmentTable } from './DepartmentTable';
import { mockDepartments, createMockDepartment } from '@/__tests__/utils/mockData';
import userEvent from '@testing-library/user-event';

describe('DepartmentTable', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnToggleActive = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <DepartmentTable
        departments={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(
      <DepartmentTable
        departments={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading departments...')).toBeInTheDocument();
  });

  it('displays empty state when no departments', () => {
    render(
      <DepartmentTable
        departments={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
        isLoading={false}
      />
    );

    expect(
      screen.getByText('No departments found. Create your first department to get started.')
    ).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(
      <DepartmentTable
        departments={mockDepartments}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Abbreviation')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Sort Order')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders department rows correctly', () => {
    render(
      <DepartmentTable
        departments={mockDepartments}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Information Technology')).toBeInTheDocument();
  });

  it('displays abbreviations correctly', () => {
    render(
      <DepartmentTable
        departments={mockDepartments}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('FIN')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });

  it('displays N/A when abbreviation is missing', () => {
    const deptWithoutAbbrev = createMockDepartment({
      id: 1,
      value1: 'Test Department',
      value2: null,
    });

    render(
      <DepartmentTable
        departments={[deptWithoutAbbrev]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('displays description from metadata', () => {
    const deptWithDescription = createMockDepartment({
      id: 1,
      value1: 'Test',
      metadata: {
        description: 'This is a test department',
        is_active: true,
        sort_order: 1,
      },
    });

    render(
      <DepartmentTable
        departments={[deptWithDescription]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('This is a test department')).toBeInTheDocument();
  });

  it('displays dash when description is missing', () => {
    const deptWithoutDescription = createMockDepartment({
      id: 1,
      value1: 'Test',
      metadata: {
        is_active: true,
        sort_order: 1,
      },
    });

    render(
      <DepartmentTable
        departments={[deptWithoutDescription]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('displays sort order correctly', () => {
    const dept = createMockDepartment({
      id: 1,
      value1: 'Test',
      metadata: {
        is_active: true,
        sort_order: 42,
      },
    });

    render(
      <DepartmentTable
        departments={[dept]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders status badges correctly', () => {
    const departments = [
      createMockDepartment({
        id: 1,
        value1: 'Active Dept',
        metadata: { is_active: true, sort_order: 1 },
      }),
      createMockDepartment({
        id: 2,
        value1: 'Inactive Dept',
        metadata: { is_active: false, sort_order: 2 },
      }),
    ];

    render(
      <DepartmentTable
        departments={departments}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    const activeBadges = screen.getAllByText('Active');
    const inactiveBadges = screen.getAllByText('Inactive');
    expect(activeBadges.length).toBeGreaterThan(0);
    expect(inactiveBadges.length).toBeGreaterThan(0);
  });

  it('sorts departments by sort_order', () => {
    const departments = [
      createMockDepartment({
        id: 1,
        value1: 'Third',
        metadata: { is_active: true, sort_order: 3 },
      }),
      createMockDepartment({
        id: 2,
        value1: 'First',
        metadata: { is_active: true, sort_order: 1 },
      }),
      createMockDepartment({
        id: 3,
        value1: 'Second',
        metadata: { is_active: true, sort_order: 2 },
      }),
    ];

    render(
      <DepartmentTable
        departments={departments}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    const rows = screen.getAllByRole('row');
    // Skip header row
    const dataRows = rows.slice(1);

    // Check that First comes before Second and Third
    const firstIndex = dataRows.findIndex((row) => row.textContent?.includes('First'));
    const secondIndex = dataRows.findIndex((row) => row.textContent?.includes('Second'));
    const thirdIndex = dataRows.findIndex((row) => row.textContent?.includes('Third'));

    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  it('opens dropdown menu on button click', async () => {
    const user = userEvent.setup();

    render(
      <DepartmentTable
        departments={[mockDepartments[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows Deactivate for active departments', async () => {
    const user = userEvent.setup();
    const activeDept = createMockDepartment({
      id: 1,
      value1: 'Active',
      metadata: { is_active: true, sort_order: 1 },
    });

    render(
      <DepartmentTable
        departments={[activeDept]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    expect(screen.getByText('Deactivate')).toBeInTheDocument();
  });

  it('shows Activate for inactive departments', async () => {
    const user = userEvent.setup();
    const inactiveDept = createMockDepartment({
      id: 1,
      value1: 'Inactive',
      metadata: { is_active: false, sort_order: 1 },
    });

    render(
      <DepartmentTable
        departments={[inactiveDept]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    expect(screen.getByText('Activate')).toBeInTheDocument();
  });

  it('calls onEdit when edit is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DepartmentTable
        departments={[mockDepartments[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockDepartments[0]);
  });

  it('calls onToggleActive when toggle is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DepartmentTable
        departments={[mockDepartments[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const deactivateButton = screen.getByText('Deactivate');
    await user.click(deactivateButton);

    expect(mockOnToggleActive).toHaveBeenCalledWith(mockDepartments[0]);
  });

  it('calls onDelete with confirmation when delete is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DepartmentTable
        departments={[mockDepartments[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Delete Department')).toBeInTheDocument();
    });

    // Click the confirm button
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(
        mockDepartments[0].id,
        mockDepartments[0].code
      );
    });
  });

  it('does not call onDelete when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    render(
      <DepartmentTable
        departments={[mockDepartments[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Delete Department')).toBeInTheDocument();
    });

    // Click the cancel button
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('formats dates correctly', () => {
    const dept = createMockDepartment({
      id: 1,
      value1: 'Test',
      created_at: '2024-01-15T10:30:00Z',
    });

    render(
      <DepartmentTable
        departments={[dept]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleActive={mockOnToggleActive}
      />
    );

    expect(screen.getByText(/Jan|2024/i)).toBeInTheDocument();
  });
});

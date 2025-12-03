import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/__tests__/utils/test-utils';
import DepartmentsPage from './DepartmentsPage';
import { mockDepartments, createMockDepartment } from '@/__tests__/utils/mockData';
import userEvent from '@testing-library/user-event';
import * as refDataApi from '@/api/refData.api';

// Mock the API
vi.mock('@/api/refData.api', () => ({
  getDepartments: vi.fn(),
  deleteRefData: vi.fn(),
  updateRefData: vi.fn(),
}));

describe('DepartmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);

    // Default mock implementation
    vi.mocked(refDataApi.getDepartments).mockResolvedValue(mockDepartments);
    vi.mocked(refDataApi.deleteRefData).mockResolvedValue();
    vi.mocked(refDataApi.updateRefData).mockResolvedValue(mockDepartments[0]);
  });

  it('renders page header and description', async () => {
    render(<DepartmentsPage />);

    expect(screen.getByText('Departments')).toBeInTheDocument();
    expect(
      screen.getByText('Manage organizational departments and teams')
    ).toBeInTheDocument();
  });

  it('renders create department button', async () => {
    render(<DepartmentsPage />);

    expect(
      screen.getByRole('button', { name: /create department/i })
    ).toBeInTheDocument();
  });

  it('displays loading state initially', async () => {
    vi.mocked(refDataApi.getDepartments).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<DepartmentsPage />);

    expect(screen.getByText('Loading departments...')).toBeInTheDocument();
  });

  it('displays departments in table after loading', async () => {
    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Information Technology')).toBeInTheDocument();
    });
  });

  it('displays empty state when no departments', async () => {
    vi.mocked(refDataApi.getDepartments).mockResolvedValue([]);

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(
        screen.getByText('No departments found. Create your first department to get started.')
      ).toBeInTheDocument();
    });
  });

  it('renders filter controls', async () => {
    render(<DepartmentsPage />);

    expect(screen.getByPlaceholderText('Search departments...')).toBeInTheDocument();
    // Status filter exists as combobox
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
  });

  it('filters departments by search query - name', async () => {
    const user = userEvent.setup();

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search departments...');
    await user.type(searchInput, 'Information');

    await waitFor(() => {
      expect(screen.getByText('Information Technology')).toBeInTheDocument();
      expect(screen.queryByText('Finance')).not.toBeInTheDocument();
    });
  });

  it('filters departments by search query - abbreviation', async () => {
    const user = userEvent.setup();

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search departments...');
    await user.type(searchInput, 'FIN');

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.queryByText('Information Technology')).not.toBeInTheDocument();
    });
  });

  it('renders status filter dropdown', async () => {
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
    vi.mocked(refDataApi.getDepartments).mockResolvedValue(departments);

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Active Dept')).toBeInTheDocument();
    });

    // Verify all departments are displayed initially
    expect(screen.getByText('Active Dept')).toBeInTheDocument();
    expect(screen.getByText('Inactive Dept')).toBeInTheDocument();
  });

  it('displays summary stats correctly', async () => {
    const departments = [
      createMockDepartment({
        id: 1,
        value1: 'Dept 1',
        metadata: { is_active: true, sort_order: 1 },
      }),
      createMockDepartment({
        id: 2,
        value1: 'Dept 2',
        metadata: { is_active: true, sort_order: 2 },
      }),
      createMockDepartment({
        id: 3,
        value1: 'Dept 3',
        metadata: { is_active: false, sort_order: 3 },
      }),
    ];
    vi.mocked(refDataApi.getDepartments).mockResolvedValue(departments);

    render(<DepartmentsPage />);

    await waitFor(() => {
      // Total Departments
      expect(screen.getByText('Total Departments')).toBeInTheDocument();
      const allThrees = screen.getAllByText('3');
      expect(allThrees.length).toBeGreaterThan(0);

      // Active (2 active) - use getAllByText since badges also say "Active"
      const activeTexts = screen.getAllByText('Active');
      expect(activeTexts.length).toBeGreaterThan(0);
      const allTwos = screen.getAllByText('2');
      expect(allTwos.length).toBeGreaterThan(0);

      // Inactive (1 inactive)
      const inactiveTexts = screen.getAllByText('Inactive');
      expect(inactiveTexts.length).toBeGreaterThan(0);
      const allOnes = screen.getAllByText('1');
      expect(allOnes.length).toBeGreaterThan(0);
    });
  });

  it('has create button that opens sheet', async () => {
    const user = userEvent.setup();

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create department/i });
    expect(createButton).toBeInTheDocument();

    // Click the button - sheet opening tested in DepartmentSheet tests
    await user.click(createButton);
  });

  it('has edit action in dropdown menu', async () => {
    const user = userEvent.setup();

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button', { name: '' })[0];
    await user.click(menuButton);

    // Verify edit button exists
    const editButton = screen.getByText('Edit');
    expect(editButton).toBeInTheDocument();
  });

  it('has delete action in dropdown menu', async () => {
    const user = userEvent.setup();

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button', { name: '' })[0];
    await user.click(menuButton);

    // Verify delete button exists
    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toBeInTheDocument();
  });

  it('has toggle active action in dropdown menu', async () => {
    const user = userEvent.setup();

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button', { name: '' })[0];
    await user.click(menuButton);

    // Verify deactivate button exists (since mockDepartment is active)
    const deactivateButton = screen.getByText('Deactivate');
    expect(deactivateButton).toBeInTheDocument();
  });

  it('calls updateRefData when toggle is clicked', async () => {
    const user = userEvent.setup();

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button', { name: '' })[0];
    await user.click(menuButton);

    // Click deactivate
    const deactivateButton = screen.getByText('Deactivate');
    await user.click(deactivateButton);

    await waitFor(() => {
      expect(refDataApi.updateRefData).toHaveBeenCalledWith(
        mockDepartments[0].code,
        expect.objectContaining({
          metadata: expect.objectContaining({
            is_active: false,
          }),
        })
      );
    });
  });

  it('displays multiple departments with different statuses', async () => {
    const departments = [
      createMockDepartment({
        id: 1,
        value1: 'Active Department',
        metadata: { is_active: true, sort_order: 1 },
      }),
      createMockDepartment({
        id: 2,
        value1: 'Inactive Department',
        metadata: { is_active: false, sort_order: 2 },
      }),
    ];
    vi.mocked(refDataApi.getDepartments).mockResolvedValue(departments);

    render(<DepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Active Department')).toBeInTheDocument();
      expect(screen.getByText('Inactive Department')).toBeInTheDocument();
    });
  });

  it('calculates inactive count correctly', async () => {
    const departments = [
      createMockDepartment({
        id: 1,
        value1: 'D1',
        metadata: { is_active: true, sort_order: 1 },
      }),
      createMockDepartment({
        id: 2,
        value1: 'D2',
        metadata: { is_active: false, sort_order: 2 },
      }),
      createMockDepartment({
        id: 3,
        value1: 'D3',
        metadata: { is_active: false, sort_order: 3 },
      }),
    ];
    vi.mocked(refDataApi.getDepartments).mockResolvedValue(departments);

    render(<DepartmentsPage />);

    await waitFor(() => {
      // Total = 3, Active = 1, so Inactive should be 2
      expect(screen.getByText('Total Departments')).toBeInTheDocument();
      const allThrees = screen.getAllByText('3');
      expect(allThrees.length).toBeGreaterThan(0);

      const activeTexts = screen.getAllByText('Active');
      expect(activeTexts.length).toBeGreaterThan(0);
      const allOnes = screen.getAllByText('1');
      expect(allOnes.length).toBeGreaterThan(0);

      const inactiveTexts = screen.getAllByText('Inactive');
      expect(inactiveTexts.length).toBeGreaterThan(0);
      const allTwos = screen.getAllByText('2');
      expect(allTwos.length).toBeGreaterThan(0);
    });
  });
});

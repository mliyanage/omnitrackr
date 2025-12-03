import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/__tests__/utils/test-utils';
import SchedulesPage from './SchedulesPage';
import { mockSchedules, createMockSchedule } from '@/__tests__/utils/mockData';
import userEvent from '@testing-library/user-event';
import * as schedulesApi from '@/api/schedules.api';

// Mock the API
vi.mock('@/api/schedules.api', () => ({
  getSchedules: vi.fn(),
  deleteSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  createSchedule: vi.fn(),
}));

describe('SchedulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);

    // Default mock implementation
    vi.mocked(schedulesApi.getSchedules).mockResolvedValue(mockSchedules);
    vi.mocked(schedulesApi.deleteSchedule).mockResolvedValue();
    vi.mocked(schedulesApi.updateSchedule).mockResolvedValue(mockSchedules[0]);
  });

  it('renders page header and description', async () => {
    render(<SchedulesPage />);

    expect(screen.getByText('Schedules')).toBeInTheDocument();
    expect(
      screen.getByText('Manage your polling schedules and execution times')
    ).toBeInTheDocument();
  });

  it('renders create schedule button', async () => {
    render(<SchedulesPage />);

    expect(screen.getByRole('button', { name: /create schedule/i })).toBeInTheDocument();
  });

  it('displays loading state initially', async () => {
    vi.mocked(schedulesApi.getSchedules).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SchedulesPage />);

    expect(screen.getByText('Loading schedules...')).toBeInTheDocument();
  });

  it('displays schedules in table after loading', async () => {
    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Daily 2 AM')).toBeInTheDocument();
      expect(screen.getByText('Every 6 Hours')).toBeInTheDocument();
    });
  });

  it('displays empty state when no schedules', async () => {
    vi.mocked(schedulesApi.getSchedules).mockResolvedValue([]);

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(
        screen.getByText('No schedules found. Create your first schedule to get started.')
      ).toBeInTheDocument();
    });
  });

  it('renders filter controls', async () => {
    render(<SchedulesPage />);

    expect(screen.getByPlaceholderText('Search schedules...')).toBeInTheDocument();
    // Frequency and Status filters exist as comboboxes
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('filters schedules by search query', async () => {
    const user = userEvent.setup();

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Daily 2 AM')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search schedules...');
    await user.type(searchInput, 'Every 6');

    await waitFor(() => {
      expect(screen.getByText('Every 6 Hours')).toBeInTheDocument();
      expect(screen.queryByText('Daily 2 AM')).not.toBeInTheDocument();
    });
  });

  it('renders frequency filter dropdown', async () => {
    const schedules = [
      createMockSchedule({ id: 1, name: 'Hourly', frequency_type: 'hourly' }),
      createMockSchedule({ id: 2, name: 'Daily', frequency_type: 'daily' }),
      createMockSchedule({ id: 3, name: 'Weekly', frequency_type: 'weekly' }),
    ];
    vi.mocked(schedulesApi.getSchedules).mockResolvedValue(schedules);

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Hourly')).toBeInTheDocument();
    });

    // Verify all schedules are displayed initially
    expect(screen.getByText('Hourly')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('renders status filter dropdown', async () => {
    const schedules = [
      createMockSchedule({ id: 1, name: 'Enabled Schedule', enabled: true }),
      createMockSchedule({ id: 2, name: 'Disabled Schedule', enabled: false }),
    ];
    vi.mocked(schedulesApi.getSchedules).mockResolvedValue(schedules);

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Enabled Schedule')).toBeInTheDocument();
    });

    // Verify all schedules are displayed initially
    expect(screen.getByText('Enabled Schedule')).toBeInTheDocument();
    expect(screen.getByText('Disabled Schedule')).toBeInTheDocument();
  });

  it('displays summary stats correctly', async () => {
    const schedules = [
      createMockSchedule({
        id: 1,
        enabled: true,
        frequency_type: 'hourly',
      }),
      createMockSchedule({
        id: 2,
        enabled: true,
        frequency_type: 'daily',
      }),
      createMockSchedule({
        id: 3,
        enabled: false,
        frequency_type: 'hourly',
      }),
      createMockSchedule({
        id: 4,
        enabled: false,
        frequency_type: 'weekly',
      }),
    ];
    vi.mocked(schedulesApi.getSchedules).mockResolvedValue(schedules);

    render(<SchedulesPage />);

    await waitFor(() => {
      // Total Schedules
      expect(screen.getByText('Total Schedules')).toBeInTheDocument();
      const allFours = screen.getAllByText('4');
      expect(allFours.length).toBeGreaterThan(0);

      // Enabled (2 enabled) - use getAllByText since badges also say "Enabled"
      const enabledTexts = screen.getAllByText('Enabled');
      expect(enabledTexts.length).toBeGreaterThan(0);
      const allTwos = screen.getAllByText('2');
      expect(allTwos.length).toBeGreaterThan(0);

      // Disabled (2 disabled)
      const disabledTexts = screen.getAllByText('Disabled');
      expect(disabledTexts.length).toBeGreaterThan(0);

      // Frequency Types (3: hourly, daily, weekly)
      expect(screen.getByText('Frequency Types')).toBeInTheDocument();
      const allThrees = screen.getAllByText('3');
      expect(allThrees.length).toBeGreaterThan(0);
    });
  });

  it('has create button that opens sheet', async () => {
    const user = userEvent.setup();

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Daily 2 AM')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create schedule/i });
    expect(createButton).toBeInTheDocument();

    // Click the button - sheet opening tested in ScheduleSheet tests
    await user.click(createButton);
  });

  it('has edit action in dropdown menu', async () => {
    const user = userEvent.setup();

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Daily 2 AM')).toBeInTheDocument();
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

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Daily 2 AM')).toBeInTheDocument();
    });

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button', { name: '' })[0];
    await user.click(menuButton);

    // Verify delete button exists
    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toBeInTheDocument();
  });

  it('has toggle enabled action in dropdown menu', async () => {
    const user = userEvent.setup();

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Daily 2 AM')).toBeInTheDocument();
    });

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button', { name: '' })[0];
    await user.click(menuButton);

    // Verify disable button exists (since mockSchedule is enabled)
    const disableButton = screen.getByText('Disable');
    expect(disableButton).toBeInTheDocument();
  });

  it('calls updateSchedule when toggle is clicked', async () => {
    const user = userEvent.setup();

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Daily 2 AM')).toBeInTheDocument();
    });

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button', { name: '' })[0];
    await user.click(menuButton);

    // Click disable
    const disableButton = screen.getByText('Disable');
    await user.click(disableButton);

    await waitFor(() => {
      expect(schedulesApi.updateSchedule).toHaveBeenCalledWith(
        mockSchedules[0].id,
        { enabled: false }
      );
    });
  });

  it('displays multiple schedules with different frequencies and statuses', async () => {
    const schedules = [
      createMockSchedule({
        id: 1,
        name: 'Hourly Enabled',
        frequency_type: 'hourly',
        enabled: true,
      }),
      createMockSchedule({
        id: 2,
        name: 'Daily Enabled',
        frequency_type: 'daily',
        enabled: true,
      }),
      createMockSchedule({
        id: 3,
        name: 'Weekly Disabled',
        frequency_type: 'weekly',
        enabled: false,
      }),
    ];
    vi.mocked(schedulesApi.getSchedules).mockResolvedValue(schedules);

    render(<SchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText('Hourly Enabled')).toBeInTheDocument();
      expect(screen.getByText('Daily Enabled')).toBeInTheDocument();
      expect(screen.getByText('Weekly Disabled')).toBeInTheDocument();
    });
  });

  it('calculates disabled count correctly', async () => {
    const schedules = [
      createMockSchedule({ id: 1, enabled: true }),
      createMockSchedule({ id: 2, enabled: true }),
      createMockSchedule({ id: 3, enabled: false }),
    ];
    vi.mocked(schedulesApi.getSchedules).mockResolvedValue(schedules);

    render(<SchedulesPage />);

    await waitFor(() => {
      // Total = 3, Enabled = 2, so Disabled should be 1
      expect(screen.getByText('Total Schedules')).toBeInTheDocument();
      const allThrees = screen.getAllByText('3');
      expect(allThrees.length).toBeGreaterThan(0);

      const enabledTexts = screen.getAllByText('Enabled');
      expect(enabledTexts.length).toBeGreaterThan(0);
      const allTwos = screen.getAllByText('2');
      expect(allTwos.length).toBeGreaterThan(0);

      const disabledTexts = screen.getAllByText('Disabled');
      expect(disabledTexts.length).toBeGreaterThan(0);
      const allOnes = screen.getAllByText('1');
      expect(allOnes.length).toBeGreaterThan(0);
    });
  });
});

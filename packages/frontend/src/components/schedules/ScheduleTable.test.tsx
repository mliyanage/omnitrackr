import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/__tests__/utils/test-utils';
import { ScheduleTable } from './ScheduleTable';
import { mockSchedules, createMockSchedule } from '@/__tests__/utils/mockData';
import userEvent from '@testing-library/user-event';

describe('ScheduleTable', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnToggleEnabled = vi.fn();
  const mockOnCalculateNextRun = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <ScheduleTable
        schedules={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(
      <ScheduleTable
        schedules={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading schedules...')).toBeInTheDocument();
  });

  it('displays empty state when no schedules', () => {
    render(
      <ScheduleTable
        schedules={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
        isLoading={false}
      />
    );

    expect(
      screen.getByText('No schedules found. Create your first schedule to get started.')
    ).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(
      <ScheduleTable
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('Execution Times')).toBeInTheDocument();
    expect(screen.getByText('Timezone')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders schedule rows correctly', () => {
    render(
      <ScheduleTable
        schedules={mockSchedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByText('Daily 2 AM')).toBeInTheDocument();
    expect(screen.getByText('Every 6 Hours')).toBeInTheDocument();
  });

  it('displays schedule description when available', () => {
    const scheduleWithDesc = createMockSchedule({
      id: 1,
      name: 'Test Schedule',
      description: 'This is a test description',
    });

    render(
      <ScheduleTable
        schedules={[scheduleWithDesc]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('formats frequency correctly for different types', () => {
    const schedules = [
      createMockSchedule({
        id: 1,
        name: 'Minutely',
        frequency_type: 'minutely',
        interval: 1,
      }),
      createMockSchedule({
        id: 2,
        name: 'Hourly',
        frequency_type: 'hourly',
        interval: 2,
      }),
      createMockSchedule({
        id: 3,
        name: 'Daily',
        frequency_type: 'daily',
        interval: 1,
      }),
      createMockSchedule({
        id: 4,
        name: 'Weekly',
        frequency_type: 'weekly',
        interval: 3,
      }),
    ];

    render(
      <ScheduleTable
        schedules={schedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByText('Every minute')).toBeInTheDocument();
    expect(screen.getByText('Every 2 hours')).toBeInTheDocument();
    expect(screen.getByText('Every day')).toBeInTheDocument();
    expect(screen.getByText('Every 3 weeks')).toBeInTheDocument();
  });

  it('formats execution times correctly', () => {
    const schedules = [
      createMockSchedule({
        id: 1,
        name: 'Single Time',
        execution_times: ['09:00'],
      }),
      createMockSchedule({
        id: 2,
        name: 'Multiple Times',
        execution_times: ['09:00', '12:00', '15:00'],
      }),
      createMockSchedule({
        id: 3,
        name: 'Many Times',
        execution_times: ['09:00', '10:00', '11:00', '12:00', '13:00'],
      }),
    ];

    render(
      <ScheduleTable
        schedules={schedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('09:00, 12:00, 15:00')).toBeInTheDocument();
    expect(screen.getByText('09:00, 10:00 +3 more')).toBeInTheDocument();
  });

  it('renders status badges correctly', () => {
    const schedules = [
      createMockSchedule({ id: 1, name: 'Enabled Schedule', enabled: true }),
      createMockSchedule({ id: 2, name: 'Disabled Schedule', enabled: false }),
    ];

    render(
      <ScheduleTable
        schedules={schedules}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('opens dropdown menu on button click', async () => {
    const user = userEvent.setup();

    render(
      <ScheduleTable
        schedules={[mockSchedules[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Disable')).toBeInTheDocument();
  });

  it('shows Calculate Next Run option when handler is provided', async () => {
    const user = userEvent.setup();

    render(
      <ScheduleTable
        schedules={[mockSchedules[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
        onCalculateNextRun={mockOnCalculateNextRun}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    expect(screen.getByText('Calculate Next Run')).toBeInTheDocument();
  });

  it('calls onEdit when edit is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ScheduleTable
        schedules={[mockSchedules[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockSchedules[0]);
  });

  it('calls onToggleEnabled when toggle is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ScheduleTable
        schedules={[mockSchedules[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const disableButton = screen.getByText('Disable');
    await user.click(disableButton);

    expect(mockOnToggleEnabled).toHaveBeenCalledWith(mockSchedules[0]);
  });

  it('calls onCalculateNextRun when calculate is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ScheduleTable
        schedules={[mockSchedules[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
        onCalculateNextRun={mockOnCalculateNextRun}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const calculateButton = screen.getByText('Calculate Next Run');
    await user.click(calculateButton);

    expect(mockOnCalculateNextRun).toHaveBeenCalledWith(mockSchedules[0]);
  });

  it('calls onDelete with confirmation when delete is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ScheduleTable
        schedules={[mockSchedules[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Delete Schedule')).toBeInTheDocument();
    });

    // Click the confirm button
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(mockSchedules[0].id);
    });
  });

  it('does not call onDelete when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    render(
      <ScheduleTable
        schedules={[mockSchedules[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Delete Schedule')).toBeInTheDocument();
    });

    // Click the cancel button
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('formats dates correctly', () => {
    const schedule = createMockSchedule({
      id: 1,
      name: 'Test Schedule',
      created_at: '2024-01-15T10:30:00Z',
    });

    render(
      <ScheduleTable
        schedules={[schedule]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByText(/Jan|2024/i)).toBeInTheDocument();
  });

  it('displays N/A for schedules with no execution times', () => {
    const schedule = createMockSchedule({
      id: 1,
      name: 'No Times',
      execution_times: null,
    });

    render(
      <ScheduleTable
        schedules={[schedule]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('displays timezone correctly', () => {
    const schedule = createMockSchedule({
      id: 1,
      name: 'Test',
      timezone: 'America/Los_Angeles',
    });

    render(
      <ScheduleTable
        schedules={[schedule]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleEnabled={mockOnToggleEnabled}
      />
    );

    expect(screen.getByText('America/Los_Angeles')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/__tests__/utils/test-utils';
import { ScheduleSheet } from './ScheduleSheet';
import { mockSchedule } from '@/__tests__/utils/mockData';

// Mock the ScheduleForm component
vi.mock('./ScheduleForm', () => ({
  ScheduleForm: ({ schedule }: { schedule?: any }) => (
    <div data-testid="schedule-form">
      {schedule && <div data-testid="editing">Editing</div>}
    </div>
  ),
}));

describe('ScheduleSheet - Simplified Tests', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  it('renders nothing when closed', () => {
    render(
      <ScheduleSheet
        open={false}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByTestId('schedule-form')).not.toBeInTheDocument();
  });

  it('renders sheet when open', () => {
    render(
      <ScheduleSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByTestId('schedule-form')).toBeInTheDocument();
  });

  it('shows create title in create mode', () => {
    render(
      <ScheduleSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
  });

  it('shows edit title in edit mode', () => {
    render(
      <ScheduleSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        schedule={mockSchedule}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Edit Schedule')).toBeInTheDocument();
  });

  it('passes schedule data to form in edit mode', () => {
    render(
      <ScheduleSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        schedule={mockSchedule}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByTestId('editing')).toBeInTheDocument();
  });
});

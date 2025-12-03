import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/__tests__/utils/test-utils';
import { ScheduleCombobox } from './ScheduleCombobox';
import { mockSchedules } from '@/__tests__/utils/mockData';

describe('ScheduleCombobox - Simplified Tests', () => {
  const mockOnChange = vi.fn();
  const mockOnCreateNew = vi.fn();

  it('renders without crashing', () => {
    render(
      <ScheduleCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays default placeholder', () => {
    render(
      <ScheduleCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Select schedule...');
  });

  it('displays custom placeholder when provided', () => {
    render(
      <ScheduleCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
        placeholder="Choose a schedule"
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Choose a schedule');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <ScheduleCombobox
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
      <ScheduleCombobox
        value={mockSchedules[0].id}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('accepts onCreateNew callback', () => {
    render(
      <ScheduleCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

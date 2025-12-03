import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/__tests__/utils/test-utils';
import { ConnectionCombobox } from './ConnectionCombobox';
import { mockConnections } from '@/__tests__/utils/mockData';

describe('ConnectionCombobox - Simplified Tests', () => {
  const mockOnChange = vi.fn();
  const mockOnCreateNew = vi.fn();

  it('renders without crashing', () => {
    render(
      <ConnectionCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays default placeholder', () => {
    render(
      <ConnectionCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Select connection...');
  });

  it('displays custom placeholder when provided', () => {
    render(
      <ConnectionCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
        placeholder="Choose a connection"
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Choose a connection');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <ConnectionCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
        disabled={true}
      />
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('accepts value and onChange props', () => {
    // Smoke test - just verify it renders with these props
    render(
      <ConnectionCombobox
        value={mockConnections[0].id}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('accepts onCreateNew callback', () => {
    // Smoke test - just verify it renders with this prop
    render(
      <ConnectionCombobox
        value={undefined}
        onChange={mockOnChange}
        onCreateNew={mockOnCreateNew}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

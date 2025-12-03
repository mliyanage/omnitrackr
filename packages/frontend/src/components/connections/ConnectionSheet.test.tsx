import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/__tests__/utils/test-utils';
import { ConnectionSheet } from './ConnectionSheet';
import { mockConnection } from '@/__tests__/utils/mockData';
import userEvent from '@testing-library/user-event';
import type { SourceConnection } from '@/types';

// Mock the ConnectionForm component to simplify testing
vi.mock('./ConnectionForm', () => ({
  ConnectionForm: ({
    connection,
    onSuccess,
    onCancel,
  }: {
    connection?: SourceConnection;
    onSuccess: (conn: SourceConnection) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="connection-form">
      <button onClick={() => onSuccess(mockConnection)}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
      {connection && <div data-testid="editing">Editing</div>}
    </div>
  ),
}));

describe('ConnectionSheet', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnSuccess.mockClear();
  });

  it('renders nothing when open is false', () => {
    render(
      <ConnectionSheet
        open={false}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument();
  });

  it('renders sheet when open is true', () => {
    render(
      <ConnectionSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByTestId('connection-form')).toBeInTheDocument();
  });

  it('shows "Create New Connection" title in create mode', () => {
    render(
      <ConnectionSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create New Connection')).toBeInTheDocument();
    expect(
      screen.getByText('Configure a new source connection for file monitoring.')
    ).toBeInTheDocument();
  });

  it('shows "Edit Connection" title in edit mode', () => {
    render(
      <ConnectionSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        connection={mockConnection}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Edit Connection')).toBeInTheDocument();
    expect(
      screen.getByText('Update the connection details below.')
    ).toBeInTheDocument();
  });

  it('passes connection data to form in edit mode', () => {
    render(
      <ConnectionSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        connection={mockConnection}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByTestId('editing')).toBeInTheDocument();
  });

  it('does not pass connection data to form in create mode', () => {
    render(
      <ConnectionSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByTestId('editing')).not.toBeInTheDocument();
  });

  it('calls onSuccess and closes sheet when form submits successfully', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Click submit button
    await user.click(screen.getByText('Submit'));

    // Should call onSuccess with connection data
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockConnection);
    });

    // Should close the sheet
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes sheet when form cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Click cancel button
    await user.click(screen.getByText('Cancel'));

    // Should close the sheet
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders ConnectionForm inside ScrollArea', () => {
    render(
      <ConnectionSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Form should be in the document (inside ScrollArea)
    expect(screen.getByTestId('connection-form')).toBeInTheDocument();
  });
});

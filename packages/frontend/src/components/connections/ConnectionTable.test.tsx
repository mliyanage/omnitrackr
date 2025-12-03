import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/__tests__/utils/test-utils';
import { ConnectionTable } from './ConnectionTable';
import { mockConnections, createMockConnection } from '@/__tests__/utils/mockData';
import userEvent from '@testing-library/user-event';

describe('ConnectionTable', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnTestConnection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <ConnectionTable
        connections={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(
      <ConnectionTable
        connections={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading connections...')).toBeInTheDocument();
  });

  it('displays empty state when no connections', () => {
    render(
      <ConnectionTable
        connections={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
        isLoading={false}
      />
    );

    expect(
      screen.getByText('No connections found. Create your first connection to get started.')
    ).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(
      <ConnectionTable
        connections={mockConnections}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders connection rows correctly', () => {
    render(
      <ConnectionTable
        connections={mockConnections}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    // Check first connection
    expect(screen.getByText('Test S3 Connection')).toBeInTheDocument();
    expect(screen.getByText('S3')).toBeInTheDocument();
    expect(screen.getByText('test-bucket')).toBeInTheDocument();

    // Check second connection
    expect(screen.getByText('SFTP Connection')).toBeInTheDocument();
    expect(screen.getByText('SFTP')).toBeInTheDocument();
    expect(screen.getByText('sftp.example.com')).toBeInTheDocument();
  });

  it('displays connection description when available', () => {
    const connectionWithDesc = createMockConnection({
      id: 1,
      name: 'Test Connection',
      description: 'This is a test description',
    });

    render(
      <ConnectionTable
        connections={[connectionWithDesc]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('renders status badges with correct variants', () => {
    const connections = [
      createMockConnection({ id: 1, name: 'Active Connection', connection_status: 'healthy', enabled: true }),
      createMockConnection({ id: 2, name: 'Inactive Connection', connection_status: 'healthy', enabled: false }),
      createMockConnection({ id: 3, name: 'Error Connection', connection_status: 'failed', enabled: true }),
    ];

    render(
      <ConnectionTable
        connections={connections}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    // All status badges should be present
    const statusBadges = screen.getAllByText(/healthy|disabled|failed/i);
    expect(statusBadges.length).toBeGreaterThan(0);
  });

  it('opens dropdown menu on button click', async () => {
    const user = userEvent.setup();

    render(
      <ConnectionTable
        connections={[mockConnections[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    expect(screen.getByText('Test Connection')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onEdit when edit is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ConnectionTable
        connections={[mockConnections[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockConnections[0]);
  });

  it('calls onTestConnection when test connection is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ConnectionTable
        connections={[mockConnections[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const testButton = screen.getByText('Test Connection');
    await user.click(testButton);

    expect(mockOnTestConnection).toHaveBeenCalledWith(mockConnections[0]);
  });

  it('calls onDelete with confirmation when delete is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ConnectionTable
        connections={[mockConnections[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Delete Connection')).toBeInTheDocument();
    });

    // Click the confirm button
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(mockConnections[0].id);
    });
  });

  it('does not call onDelete when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    render(
      <ConnectionTable
        connections={[mockConnections[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    const menuButton = screen.getByRole('button', { name: '' });
    await user.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Delete Connection')).toBeInTheDocument();
    });

    // Click the cancel button
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('formats dates correctly', () => {
    const connection = createMockConnection({
      id: 1,
      name: 'Test Connection',
      created_at: '2024-01-15T10:30:00Z',
    });

    render(
      <ConnectionTable
        connections={[connection]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    // Check that date is formatted (exact format may vary by locale)
    expect(screen.getByText(/Jan|2024/i)).toBeInTheDocument();
  });

  it('displays correct config for Azure Blob connections', () => {
    const azureConnection = createMockConnection({
      id: 1,
      name: 'Azure Connection',
      type: 'AZURE_BLOB',
      connection_config: {
        account_name: 'myaccount',
        container: 'mycontainer',
        account_key: 'key123',
      },
    });

    render(
      <ConnectionTable
        connections={[azureConnection]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    // Should display container for Azure connections
    expect(screen.getByText('mycontainer')).toBeInTheDocument();
  });

  it('handles connections with no config gracefully', () => {
    const emptyConfigConnection = createMockConnection({
      id: 1,
      name: 'Empty Config Connection',
      connection_config: {},
    });

    render(
      <ConnectionTable
        connections={[emptyConfigConnection]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onTestConnection={mockOnTestConnection}
        onViewHealth={vi.fn()}
      />
    );

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});

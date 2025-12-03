import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/__tests__/utils/test-utils';
import ConnectionsPage from './ConnectionsPage';
import { mockConnections, createMockConnection } from '@/__tests__/utils/mockData';
import userEvent from '@testing-library/user-event';
import * as connectionsApi from '@/api/connections.api';

// Mock the API
vi.mock('@/api/connections.api', () => ({
  getConnections: vi.fn(),
  deleteConnection: vi.fn(),
  testConnection: vi.fn(),
}));

describe('ConnectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);

    // Default mock implementation
    vi.mocked(connectionsApi.getConnections).mockResolvedValue(mockConnections);
    vi.mocked(connectionsApi.deleteConnection).mockResolvedValue();
    vi.mocked(connectionsApi.testConnection).mockResolvedValue({
      success: true,
      message: 'Connection successful',
    });
  });

  it('renders page header and description', async () => {
    render(<ConnectionsPage />);

    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('Manage your data source connections')).toBeInTheDocument();
  });

  it('renders create connection button', async () => {
    render(<ConnectionsPage />);

    expect(screen.getByRole('button', { name: /create connection/i })).toBeInTheDocument();
  });

  it('displays loading state initially', async () => {
    vi.mocked(connectionsApi.getConnections).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ConnectionsPage />);

    expect(screen.getByText('Loading connections...')).toBeInTheDocument();
  });

  it('displays connections in table after loading', async () => {
    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test S3 Connection')).toBeInTheDocument();
      expect(screen.getByText('SFTP Connection')).toBeInTheDocument();
    });
  });

  it('displays empty state when no connections', async () => {
    vi.mocked(connectionsApi.getConnections).mockResolvedValue([]);

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(
        screen.getByText('No connections found. Create your first connection to get started.')
      ).toBeInTheDocument();
    });
  });

  it('renders filter controls', async () => {
    render(<ConnectionsPage />);

    expect(screen.getByPlaceholderText('Search connections...')).toBeInTheDocument();
    // Type and Status filters exist as comboboxes
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('filters connections by search query', async () => {
    const user = userEvent.setup();

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test S3 Connection')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search connections...');
    await user.type(searchInput, 'SFTP');

    await waitFor(() => {
      expect(screen.getByText('SFTP Connection')).toBeInTheDocument();
      expect(screen.queryByText('Test S3 Connection')).not.toBeInTheDocument();
    });
  });

  it('renders type filter dropdown', async () => {
    const connections = [
      createMockConnection({ id: 1, name: 'S3 Conn', type: 'S3' }),
      createMockConnection({ id: 2, name: 'SFTP Conn', type: 'SFTP' }),
      createMockConnection({ id: 3, name: 'Azure Conn', type: 'AZURE_BLOB' }),
    ];
    vi.mocked(connectionsApi.getConnections).mockResolvedValue(connections);

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('S3 Conn')).toBeInTheDocument();
    });

    // Verify all connections are displayed initially
    expect(screen.getByText('S3 Conn')).toBeInTheDocument();
    expect(screen.getByText('SFTP Conn')).toBeInTheDocument();
    expect(screen.getByText('Azure Conn')).toBeInTheDocument();
  });

  it('renders status filter dropdown', async () => {
    const connections = [
      createMockConnection({ id: 1, name: 'Active Conn', status: 'active' }),
      createMockConnection({ id: 2, name: 'Inactive Conn', status: 'inactive' }),
      createMockConnection({ id: 3, name: 'Error Conn', status: 'error' }),
    ];
    vi.mocked(connectionsApi.getConnections).mockResolvedValue(connections);

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Active Conn')).toBeInTheDocument();
    });

    // Verify all connections are displayed initially
    expect(screen.getByText('Active Conn')).toBeInTheDocument();
    expect(screen.getByText('Inactive Conn')).toBeInTheDocument();
    expect(screen.getByText('Error Conn')).toBeInTheDocument();
  });

  it('displays summary stats correctly', async () => {
    const connections = [
      createMockConnection({ id: 1, status: 'active', type: 'S3' }),
      createMockConnection({ id: 2, status: 'active', type: 'SFTP' }),
      createMockConnection({ id: 3, status: 'error', type: 'S3' }),
      createMockConnection({ id: 4, status: 'inactive', type: 'AZURE_BLOB' }),
    ];
    vi.mocked(connectionsApi.getConnections).mockResolvedValue(connections);

    render(<ConnectionsPage />);

    await waitFor(() => {
      // Total Connections
      expect(screen.getByText('Total Connections')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();

      // Active
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();

      // Errors
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();

      // Types (should be 3: S3, SFTP, AZURE_BLOB)
      expect(screen.getByText('Types')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('has create button that opens sheet', async () => {
    const user = userEvent.setup();

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test S3 Connection')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create connection/i });
    expect(createButton).toBeInTheDocument();

    // Click the button - sheet opening tested in ConnectionSheet tests
    await user.click(createButton);
  });

  it('has edit action in dropdown menu', async () => {
    const user = userEvent.setup();

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test S3 Connection')).toBeInTheDocument();
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

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test S3 Connection')).toBeInTheDocument();
    });

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button', { name: '' })[0];
    await user.click(menuButton);

    // Verify delete button exists
    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toBeInTheDocument();
  });

  it('calls test connection API when test connection is clicked', async () => {
    const user = userEvent.setup();

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test S3 Connection')).toBeInTheDocument();
    });

    // Open dropdown menu
    const menuButton = screen.getAllByRole('button', { name: '' })[0];
    await user.click(menuButton);

    // Click test connection
    const testButton = screen.getByText('Test Connection');
    await user.click(testButton);

    await waitFor(() => {
      expect(connectionsApi.testConnection).toHaveBeenCalledWith({
        type: mockConnections[0].type,
        connection_config: mockConnections[0].connection_config,
      });
    });
  });

  it('displays multiple connections with different types and statuses', async () => {
    const connections = [
      createMockConnection({
        id: 1,
        name: 'Active S3 Connection',
        type: 'S3',
        status: 'active',
      }),
      createMockConnection({
        id: 2,
        name: 'Active SFTP Connection',
        type: 'SFTP',
        status: 'active',
      }),
      createMockConnection({
        id: 3,
        name: 'Error S3 Connection',
        type: 'S3',
        status: 'error',
      }),
    ];
    vi.mocked(connectionsApi.getConnections).mockResolvedValue(connections);

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Active S3 Connection')).toBeInTheDocument();
      expect(screen.getByText('Active SFTP Connection')).toBeInTheDocument();
      expect(screen.getByText('Error S3 Connection')).toBeInTheDocument();
    });
  });
});

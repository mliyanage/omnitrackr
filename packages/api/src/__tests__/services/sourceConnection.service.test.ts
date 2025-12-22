import { SourceConnectionService } from '../../services/sourceConnection.service';
import { SourceConnectionRepository } from '@omnitrackr/shared';
import { NotFoundError } from '../../utils/errors';
import {
  SourceConnection,
  CreateSourceConnectionRequest,
  TestSourceConnectionRequest,
} from '@omnitrackr/shared';

// Mock the repositories
jest.mock('@omnitrackr/shared', () => ({
  ...jest.requireActual('@omnitrackr/shared'),
  SourceConnectionRepository: jest.fn(),
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');

describe('SourceConnectionService', () => {
  let service: SourceConnectionService;
  let mockRepo: jest.Mocked<SourceConnectionRepository>;

  const mockConnection: SourceConnection = {
    id: 1,
    name: 'Test S3 Connection',
    type: 'S3',
    description: 'Test connection',
    connection_config: {
      region: 'us-east-1',
      bucket: 'test-bucket',
      accessKeyId: 'TEST123',
      secretAccessKey: 'secret123',
    },
    connection_status: 'healthy',
    last_health_check: new Date(),
    last_successful_connection: new Date(),
    health_check_error: null,
    credential_last_rotated: null,
    credential_expires_at: null,
    enabled: true,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    updated_by: null,
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      findById: jest.fn(),
      findWithFilters: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      updateHealthStatus: jest.fn(),
      findUnhealthy: jest.fn(),
      findExpiringCredentials: jest.fn(),
      findDeletedByName: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn(),
    } as any;

    (SourceConnectionRepository as jest.Mock).mockImplementation(() => mockRepo);
    service = new SourceConnectionService();
  });

  describe('getAll', () => {
    it('should get all connections with pagination', async () => {
      const mockResult = {
        data: [mockConnection],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockRepo.findWithFilters.mockResolvedValue(mockResult);

      const result = await service.getAll(1, 20);

      expect(mockRepo.findWithFilters).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(mockResult);
    });

    it('should filter by type and status', async () => {
      const mockResult = {
        data: [mockConnection],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      mockRepo.findWithFilters.mockResolvedValue(mockResult);

      await service.getAll(1, 20, {
        type: 'S3',
        connection_status: 'healthy',
      });

      expect(mockRepo.findWithFilters).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        type: 'S3',
        connection_status: 'healthy',
      });
    });
  });

  describe('getById', () => {
    it('should return connection when found', async () => {
      mockRepo.findById.mockResolvedValue(mockConnection);

      const result = await service.getById(1);

      expect(mockRepo.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockConnection);
    });

    it('should throw NotFoundError when not found', async () => {
      mockRepo.findById.mockResolvedValue(undefined);

      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when deleted', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockConnection,
        deleted_at: new Date(),
      });

      await expect(service.getById(1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('testConnection', () => {
    const testRequest: TestSourceConnectionRequest = {
      type: 'S3',
      connection_config: {
        region: 'us-east-1',
        bucket: 'test-bucket',
        accessKeyId: 'TEST123',
        secretAccessKey: 'secret123',
      },
    };

    it('should return test result structure', async () => {
      const result = await service.testConnection(testRequest);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('canAuthenticate');
      expect(result).toHaveProperty('canAccess');
      expect(result).toHaveProperty('canList');
    });

    it('should return error for unsupported connection type', async () => {
      const result = await service.testConnection({
        type: 'FTP' as any,
        connection_config: {},
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not yet implemented');
    });
  });

  describe('create', () => {
    const createRequest: CreateSourceConnectionRequest = {
      name: 'New Connection',
      type: 'S3',
      description: 'Test',
      connection_config: {
        region: 'us-east-1',
        bucket: 'test-bucket',
        accessKeyId: 'TEST123',
        secretAccessKey: 'secret123',
      },
      enabled: true,
    };

    it('should create connection after successful test', async () => {
      mockRepo.create.mockResolvedValue(mockConnection);

      const result = await service.create(createRequest, 'user123');

      expect(mockRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockConnection);
    });
  });

  describe('update', () => {
    it('should update connection', async () => {
      const updates = {
        name: 'Updated Name',
        enabled: false,
      };

      const updatedConnection = {
        ...mockConnection,
        ...updates,
      };

      // First call to check if exists, second call to return updated
      mockRepo.findById
        .mockResolvedValueOnce(mockConnection)
        .mockResolvedValueOnce(updatedConnection);
      mockRepo.update.mockResolvedValue(updatedConnection);
      mockRepo.updateHealthStatus.mockResolvedValue(undefined);

      const result = await service.update(1, updates, 'user123');

      expect(mockRepo.findById).toHaveBeenCalledWith(1);
      expect(mockRepo.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundError if connection does not exist', async () => {
      mockRepo.findById.mockResolvedValue(undefined);

      await expect(service.update(999, { name: 'New' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should soft delete connection', async () => {
      mockRepo.findById.mockResolvedValue(mockConnection);
      mockRepo.softDelete.mockResolvedValue(undefined);

      await service.delete(1);

      expect(mockRepo.findById).toHaveBeenCalledWith(1);
      expect(mockRepo.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('toggleEnabled', () => {
    it('should enable connection', async () => {
      mockRepo.findById.mockResolvedValue(mockConnection);
      mockRepo.update.mockResolvedValue({ ...mockConnection, enabled: true });

      const result = await service.toggleEnabled(1, true);

      expect(mockRepo.update).toHaveBeenCalledWith(1, { enabled: true });
      expect(result.enabled).toBe(true);
    });
  });
});

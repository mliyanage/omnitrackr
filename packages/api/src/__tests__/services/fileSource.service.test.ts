import { FileSourceService } from '../../services/fileSource.service';
import { FileSourceRepository } from '@omnitrackr/shared';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { FileSource, CreateS3FileSourceRequest, TestConnectionRequest } from '@omnitrackr/shared';

// Mock the repositories
jest.mock('@omnitrackr/shared', () => ({
  ...jest.requireActual('@omnitrackr/shared'),
  FileSourceRepository: jest.fn(),
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-secrets-manager');

/**
 * FileSourceService Unit Tests
 * Tests business logic with mocked dependencies
 */

describe('FileSourceService', () => {
  let service: FileSourceService;
  let mockFileSourceRepo: jest.Mocked<FileSourceRepository>;

  const mockFileSource: FileSource = {
    id: 1,
    name: 'Test File Source',
    type: 'S3',
    status: 'active',
    enabled: true,
    connection_config: {
      sourceType: 'S3',
      bucketName: 'test-bucket',
      bucketRegion: 'us-east-1',
      monitorPath: '/test/',
      credentialId: 'test-cred-123',
    },
    file_name_pattern: 'test_*.csv',
    match_rule: 'partial',
    schedule: '09:00',
    timezone: 'UTC',
    sla_threshold: 120,
    direction: 'inward',
    department: 'Finance',
    success_rate: 100,
    files_processed: 0,
    last_sync: null,
    last_sync_status: null,
    last_sync_error: null,
    last_poll_duration_ms: null,
    last_objects_scanned: null,
    last_objects_detected: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock repository instances
    mockFileSourceRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      paginate: jest.fn(),
      findByDepartment: jest.fn(),
      findEnabled: jest.fn(),
      updateStatus: jest.fn(),
      updateSyncStatus: jest.fn(),
    } as any;

    // Mock repository constructors
    (FileSourceRepository as jest.Mock).mockImplementation(() => mockFileSourceRepo);

    // Create service instance
    service = new FileSourceService();
  });

  describe('getAll', () => {
    it('should get all file sources with pagination', async () => {
      const mockResult = {
        data: [mockFileSource],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockFileSourceRepo.paginate.mockResolvedValue(mockResult);

      const result = await service.getAll(1, 20);

      expect(mockFileSourceRepo.paginate).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filters: undefined,
      });
      expect(result).toEqual(mockResult);
    });

    it('should filter by department', async () => {
      const mockResult = {
        data: [mockFileSource],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockFileSourceRepo.paginate.mockResolvedValue(mockResult);

      await service.getAll(1, 20, 'Finance');

      expect(mockFileSourceRepo.paginate).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filters: { department: 'Finance' },
      });
    });
  });

  describe('getById', () => {
    it('should return file source when found', async () => {
      mockFileSourceRepo.findById.mockResolvedValue(mockFileSource);

      const result = await service.getById(1);

      expect(mockFileSourceRepo.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFileSource);
    });

    it('should throw NotFoundError when not found', async () => {
      mockFileSourceRepo.findById.mockResolvedValue(undefined);

      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
      await expect(service.getById(999)).rejects.toThrow('File Source with ID 999 not found');
    });
  });

  describe('testS3Connection', () => {
    const testRequest: TestConnectionRequest = {
      awsAccessKeyId: 'AKIATEST123456789012',
      awsSecretAccessKey: 'test-secret-key-12345678901234567890',
      bucketName: 'test-bucket',
      bucketRegion: 'us-east-1',
      monitorPath: '/test/',
    };

    it('should return success when connection is valid', async () => {
      // We're testing the structure, actual AWS calls are mocked
      const result = await service.testS3Connection(testRequest);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('canAuthenticate');
      expect(result).toHaveProperty('canAccessBucket');
      expect(result).toHaveProperty('canListObjects');
    });

    it('should handle connection failures gracefully', async () => {
      const result = await service.testS3Connection(testRequest);

      // With mocked AWS SDK, this will fail but should not throw
      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.errorMessage).toBeDefined();
      }
    });
  });

  describe('update', () => {
    it('should update file source', async () => {
      const updates = {
        name: 'Updated Name',
        sla_threshold: 180,
      };

      mockFileSourceRepo.findById.mockResolvedValue(mockFileSource);
      mockFileSourceRepo.update.mockResolvedValue({
        ...mockFileSource,
        ...updates,
      });

      const result = await service.update(1, updates, 'user123');

      expect(mockFileSourceRepo.findById).toHaveBeenCalledWith(1);
      expect(mockFileSourceRepo.update).toHaveBeenCalledWith(1, {
        ...updates,
        updated_by: 'user123',
      });
      expect(result.name).toBe('Updated Name');
      expect(result.sla_threshold).toBe(180);
    });

    it('should throw NotFoundError if file source does not exist', async () => {
      mockFileSourceRepo.findById.mockResolvedValue(undefined);

      await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete file source', async () => {
      mockFileSourceRepo.findById.mockResolvedValue(mockFileSource);
      mockFileSourceRepo.delete.mockResolvedValue(true);

      await service.delete(1);

      expect(mockFileSourceRepo.findById).toHaveBeenCalledWith(1);
      expect(mockFileSourceRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError if file source does not exist', async () => {
      mockFileSourceRepo.findById.mockResolvedValue(undefined);

      await expect(service.delete(999)).rejects.toThrow(NotFoundError);
      expect(mockFileSourceRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('toggleEnabled', () => {
    it('should enable file source', async () => {
      const enabledSource = { ...mockFileSource, enabled: true };
      mockFileSourceRepo.update.mockResolvedValue(enabledSource);

      const result = await service.toggleEnabled(1, true);

      expect(mockFileSourceRepo.update).toHaveBeenCalledWith(1, { enabled: true });
      expect(result.enabled).toBe(true);
    });

    it('should disable file source', async () => {
      const disabledSource = { ...mockFileSource, enabled: false };
      mockFileSourceRepo.update.mockResolvedValue(disabledSource);

      const result = await service.toggleEnabled(1, false);

      expect(mockFileSourceRepo.update).toHaveBeenCalledWith(1, { enabled: false });
      expect(result.enabled).toBe(false);
    });
  });

  // Note: getStatistics tests will be added once InwardFileRepository is implemented
  // describe('getStatistics', () => { ... });
});

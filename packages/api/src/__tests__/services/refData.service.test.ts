import { RefDataService } from '../../services/refData.service';
import { RefDataRepository } from '@omnitrackr/shared';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { RefData, CreateRefDataRequest } from '@omnitrackr/shared';

jest.mock('@omnitrackr/shared', () => ({
  ...jest.requireActual('@omnitrackr/shared'),
  RefDataRepository: jest.fn(),
}));

describe('RefDataService', () => {
  let service: RefDataService;
  let mockRepo: jest.Mocked<RefDataRepository>;

  const mockRefData: RefData = {
    id: 1,
    code: 'DEPARTMENT:Finance',
    value1: 'Finance',
    value2: 'FIN',
    value3: null,
    value4: null,
    value5: null,
    metadata: { description: 'Finance Department' },
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    updated_by: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      findByCode: jest.fn(),
      findByPrefix: jest.fn(),
      findWithOptions: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteByCode: jest.fn(),
      codeExists: jest.fn(),
      upsert: jest.fn(),
      getDepartments: jest.fn(),
      getTimezones: jest.fn(),
      getHolidays: jest.fn(),
      getSLAThresholds: jest.fn(),
      getCategories: jest.fn(),
      searchByValue: jest.fn(),
    } as any;

    (RefDataRepository as jest.Mock).mockImplementation(() => mockRepo);
    service = new RefDataService();
  });

  describe('getAll', () => {
    it('should get all ref data with pagination', async () => {
      const mockResult = {
        data: [mockRefData],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      };

      mockRepo.findWithOptions.mockResolvedValue(mockResult);

      const result = await service.getAll();

      expect(mockRepo.findWithOptions).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('getByCode', () => {
    it('should return ref data when found', async () => {
      mockRepo.findByCode.mockResolvedValue(mockRefData);

      const result = await service.getByCode('DEPARTMENT:Finance');

      expect(result).toEqual(mockRefData);
    });

    it('should throw NotFoundError when not found', async () => {
      mockRepo.findByCode.mockResolvedValue(undefined);

      await expect(service.getByCode('INVALID')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByPrefix', () => {
    it('should return ref data by prefix', async () => {
      mockRepo.findByPrefix.mockResolvedValue([mockRefData]);

      const result = await service.getByPrefix('DEPARTMENT:');

      expect(mockRepo.findByPrefix).toHaveBeenCalledWith('DEPARTMENT:');
      expect(result).toEqual([mockRefData]);
    });
  });

  describe('create', () => {
    const createRequest: CreateRefDataRequest = {
      code: 'DEPARTMENT:IT',
      value1: 'Information Technology',
      value2: 'IT',
    };

    it('should create ref data if code does not exist', async () => {
      mockRepo.codeExists.mockResolvedValue(false);
      mockRepo.create.mockResolvedValue(mockRefData);

      const result = await service.create(createRequest, 'user123');

      expect(mockRepo.codeExists).toHaveBeenCalledWith('DEPARTMENT:IT');
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockRefData);
    });

    it('should throw ConflictError if code already exists', async () => {
      mockRepo.codeExists.mockResolvedValue(true);

      await expect(service.create(createRequest, 'user123')).rejects.toThrow(ConflictError);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update ref data', async () => {
      const updates = { value1: 'Updated Value' };

      mockRepo.findByCode.mockResolvedValue(mockRefData);
      mockRepo.update.mockResolvedValue({
        ...mockRefData,
        ...updates,
      });

      const result = await service.update('DEPARTMENT:Finance', updates, 'user123');

      expect(mockRepo.update).toHaveBeenCalled();
      expect(result.value1).toBe('Updated Value');
    });
  });

  describe('delete', () => {
    it('should delete ref data by code', async () => {
      mockRepo.deleteByCode.mockResolvedValue(true);

      await service.delete('DEPARTMENT:Finance');

      expect(mockRepo.deleteByCode).toHaveBeenCalledWith('DEPARTMENT:Finance');
    });

    it('should throw NotFoundError if code does not exist', async () => {
      mockRepo.deleteByCode.mockResolvedValue(false);

      await expect(service.delete('INVALID')).rejects.toThrow(NotFoundError);
    });
  });

  describe('convenience methods', () => {
    it('should get departments', async () => {
      mockRepo.getDepartments.mockResolvedValue([mockRefData]);

      const result = await service.getDepartments();

      expect(mockRepo.getDepartments).toHaveBeenCalled();
      expect(result).toEqual([mockRefData]);
    });

    it('should get timezones', async () => {
      mockRepo.getTimezones.mockResolvedValue([mockRefData]);

      const result = await service.getTimezones();

      expect(mockRepo.getTimezones).toHaveBeenCalled();
    });

    it('should get holidays for a calendar', async () => {
      mockRepo.getHolidays.mockResolvedValue([mockRefData]);

      const result = await service.getHolidays('HOLIDAY_US_2025');

      expect(mockRepo.getHolidays).toHaveBeenCalledWith('HOLIDAY_US_2025');
    });

    it('should search ref data', async () => {
      mockRepo.searchByValue.mockResolvedValue([mockRefData]);

      const result = await service.search('Finance');

      expect(mockRepo.searchByValue).toHaveBeenCalledWith('Finance');
    });
  });
});

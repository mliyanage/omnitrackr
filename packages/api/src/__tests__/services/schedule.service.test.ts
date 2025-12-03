import { ScheduleService } from '../../services/schedule.service';
import { ScheduleRepository, ScheduleExclusionRepository } from '@omnitrackr/shared';
import { NotFoundError } from '../../utils/errors';
import { Schedule, CreateScheduleRequest } from '@omnitrackr/shared';

jest.mock('@omnitrackr/shared', () => ({
  ...jest.requireActual('@omnitrackr/shared'),
  ScheduleRepository: jest.fn(),
  ScheduleExclusionRepository: jest.fn(),
}));

describe('ScheduleService', () => {
  let service: ScheduleService;
  let mockScheduleRepo: jest.Mocked<ScheduleRepository>;
  let mockExclusionRepo: jest.Mocked<ScheduleExclusionRepository>;

  const mockSchedule: Schedule = {
    id: 1,
    name: 'Every 15 minutes',
    description: 'Test schedule',
    frequency_type: 'minutely',
    interval: 15,
    execution_times: null,
    days_of_week: null,
    day_of_month: null,
    week_of_month: null,
    timezone: 'UTC',
    valid_from: null,
    valid_until: null,
    enabled: true,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    updated_by: null,
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockScheduleRepo = {
      findById: jest.fn(),
      findWithFilters: jest.fn(),
      findWithExclusions: jest.fn(),
      findActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findDeletedByName: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn(),
    } as any;

    mockExclusionRepo = {
      findByScheduleId: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as any;

    (ScheduleRepository as jest.Mock).mockImplementation(() => mockScheduleRepo);
    (ScheduleExclusionRepository as jest.Mock).mockImplementation(() => mockExclusionRepo);
    service = new ScheduleService();
  });

  describe('getAll', () => {
    it('should get all schedules with pagination', async () => {
      const mockResult = {
        data: [mockSchedule],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      mockScheduleRepo.findWithFilters.mockResolvedValue(mockResult);

      const result = await service.getAll(1, 20);

      expect(mockScheduleRepo.findWithFilters).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('getById', () => {
    it('should return schedule when found', async () => {
      mockScheduleRepo.findById.mockResolvedValue(mockSchedule);

      const result = await service.getById(1);

      expect(result).toEqual(mockSchedule);
    });

    it('should throw NotFoundError when not found', async () => {
      mockScheduleRepo.findById.mockResolvedValue(undefined);

      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    const createRequest: CreateScheduleRequest = {
      name: 'New Schedule',
      frequency_type: 'daily',
      interval: 1,
      execution_times: ['09:00'],
      timezone: 'UTC',
      enabled: true,
    };

    it('should create schedule', async () => {
      mockScheduleRepo.create.mockResolvedValue(mockSchedule);

      const result = await service.create(createRequest, 'user123');

      expect(mockScheduleRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('update', () => {
    it('should update schedule', async () => {
      const updates = { name: 'Updated Name' };

      mockScheduleRepo.findById.mockResolvedValue(mockSchedule);
      mockScheduleRepo.update.mockResolvedValue({
        ...mockSchedule,
        ...updates,
      });

      const result = await service.update(1, updates, 'user123');

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('toggleEnabled', () => {
    it('should toggle schedule enabled status', async () => {
      mockScheduleRepo.findById.mockResolvedValue(mockSchedule);
      mockScheduleRepo.update.mockResolvedValue({
        ...mockSchedule,
        enabled: false,
      });

      const result = await service.toggleEnabled(1, false);

      expect(mockScheduleRepo.update).toHaveBeenCalledWith(1, { enabled: false });
      expect(result.enabled).toBe(false);
    });
  });

  describe('getActive', () => {
    it('should return active schedules', async () => {
      mockScheduleRepo.findActive.mockResolvedValue([mockSchedule]);

      const result = await service.getActive();

      expect(mockScheduleRepo.findActive).toHaveBeenCalled();
      expect(result).toEqual([mockSchedule]);
    });
  });
});

import { WatcherService } from '../../services/watcher.service';
import {
  WatcherRepository,
  SourceConnectionRepository,
  ScheduleRepository,
} from '@omnitrackr/shared';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { Watcher, CreateWatcherRequest } from '@omnitrackr/shared';

jest.mock('@omnitrackr/shared', () => ({
  ...jest.requireActual('@omnitrackr/shared'),
  WatcherRepository: jest.fn(),
  SourceConnectionRepository: jest.fn(),
  ScheduleRepository: jest.fn(),
}));

describe('WatcherService', () => {
  let service: WatcherService;
  let mockWatcherRepo: jest.Mocked<WatcherRepository>;
  let mockConnectionRepo: jest.Mocked<SourceConnectionRepository>;
  let mockScheduleRepo: jest.Mocked<ScheduleRepository>;

  const mockWatcher: Watcher = {
    id: 1,
    source_connection_id: 1,
    schedule_id: 1,
    department_code: 'DEPARTMENT:Finance',
    name: 'Test Watcher',
    description: 'Test watcher',
    file_name_pattern: '*.csv',
    file_path_pattern: '/test/',
    match_rule: 'partial',
    last_check_at: null,
    last_check_status: 'never_run',
    last_files_detected: 0,
    sla_enabled: false,
    sla_threshold_minutes: null,
    direction: 'inward',
    owner_team: 'Data Team',
    status: 'active',
    total_files_detected: 0,
    total_polls_succeeded: 0,
    total_polls_failed: 0,
    success_rate: 0,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    updated_by: null,
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockWatcherRepo = {
      findById: jest.fn(),
      findWithFilters: jest.fn(),
      findWithRelations: jest.fn(),
      findActive: jest.fn(),
      findByConnectionId: jest.fn(),
      findByDepartment: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      updateStatus: jest.fn(),
      findDeletedByName: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn(),
    } as any;

    mockConnectionRepo = {
      findById: jest.fn(),
    } as any;

    mockScheduleRepo = {
      findById: jest.fn(),
    } as any;

    (WatcherRepository as jest.Mock).mockImplementation(() => mockWatcherRepo);
    (SourceConnectionRepository as jest.Mock).mockImplementation(() => mockConnectionRepo);
    (ScheduleRepository as jest.Mock).mockImplementation(() => mockScheduleRepo);

    service = new WatcherService();
  });

  describe('getAll', () => {
    it('should get all watchers with pagination', async () => {
      const mockResult = {
        data: [mockWatcher],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      mockWatcherRepo.findWithFilters.mockResolvedValue(mockResult);

      const result = await service.getAll(1, 20);

      expect(mockWatcherRepo.findWithFilters).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('getById', () => {
    it('should return watcher when found', async () => {
      mockWatcherRepo.findById.mockResolvedValue(mockWatcher);

      const result = await service.getById(1);

      expect(result).toEqual(mockWatcher);
    });

    it('should throw NotFoundError when not found', async () => {
      mockWatcherRepo.findById.mockResolvedValue(undefined);

      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    const createRequest: CreateWatcherRequest = {
      source_connection_id: 1,
      schedule_id: 1,
      name: 'New Watcher',
      file_name_pattern: '*.csv',
      match_rule: 'partial',
      direction: 'inward',
      status: 'active',
    };

    it('should create watcher after validating references', async () => {
      mockConnectionRepo.findById.mockResolvedValue({ id: 1 } as any);
      mockScheduleRepo.findById.mockResolvedValue({ id: 1 } as any);
      mockWatcherRepo.create.mockResolvedValue(mockWatcher);

      const result = await service.create(createRequest, 'user123');

      expect(mockConnectionRepo.findById).toHaveBeenCalledWith(1);
      expect(mockScheduleRepo.findById).toHaveBeenCalledWith(1);
      expect(mockWatcherRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockWatcher);
    });

    it('should throw ValidationError if connection not found', async () => {
      mockConnectionRepo.findById.mockResolvedValue(undefined);

      await expect(service.create(createRequest, 'user123')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if schedule not found', async () => {
      mockConnectionRepo.findById.mockResolvedValue({ id: 1 } as any);
      mockScheduleRepo.findById.mockResolvedValue(undefined);

      await expect(service.create(createRequest, 'user123')).rejects.toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('should update watcher', async () => {
      const updates = { name: 'Updated Name' };

      mockWatcherRepo.findById.mockResolvedValue(mockWatcher);
      mockWatcherRepo.update.mockResolvedValue({
        ...mockWatcher,
        ...updates,
      });

      const result = await service.update(1, updates, 'user123');

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('updateStatus', () => {
    it('should update watcher status', async () => {
      mockWatcherRepo.findById.mockResolvedValue(mockWatcher);
      mockWatcherRepo.updateStatus.mockResolvedValue(undefined);
      mockWatcherRepo.findById.mockResolvedValue({
        ...mockWatcher,
        status: 'paused',
      });

      const result = await service.updateStatus(1, 'paused');

      expect(mockWatcherRepo.updateStatus).toHaveBeenCalledWith(1, 'paused');
      expect(result.status).toBe('paused');
    });
  });

  describe('getActive', () => {
    it('should return active watchers', async () => {
      mockWatcherRepo.findActive.mockResolvedValue([mockWatcher]);

      const result = await service.getActive();

      expect(mockWatcherRepo.findActive).toHaveBeenCalled();
      expect(result).toEqual([mockWatcher]);
    });
  });
});

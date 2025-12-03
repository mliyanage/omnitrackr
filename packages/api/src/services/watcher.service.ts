import {
  WatcherRepository,
  SourceConnectionRepository,
  ScheduleRepository,
  Watcher,
  WatcherWithRelations,
  CreateWatcherRequest,
  UpdateWatcherRequest,
  WatcherStatus,
  DirectionType,
} from '@omnitrackr/shared';
import { db } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * Watcher Service
 * Business logic for managing watchers
 */
export class WatcherService {
  private watcherRepo: WatcherRepository;
  private connectionRepo: SourceConnectionRepository;
  private scheduleRepo: ScheduleRepository;

  constructor() {
    this.watcherRepo = new WatcherRepository(db);
    this.connectionRepo = new SourceConnectionRepository(db);
    this.scheduleRepo = new ScheduleRepository(db);
  }

  /**
   * Get all watchers with pagination
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    filters?: {
      source_connection_id?: number;
      schedule_id?: number;
      department_code?: string;
      status?: WatcherStatus;
      direction?: DirectionType;
    }
  ) {
    return this.watcherRepo.findWithFilters({
      ...filters,
      page,
      limit,
    });
  }

  /**
   * Get watcher by ID
   */
  async getById(id: number): Promise<Watcher> {
    const watcher = await this.watcherRepo.findById<Watcher>(id);
    if (!watcher || watcher.deleted_at) {
      throw new NotFoundError('Watcher', id);
    }
    return watcher;
  }

  /**
   * Get watcher with relations
   */
  async getWithRelations(id: number): Promise<WatcherWithRelations> {
    const watcher = await this.watcherRepo.findWithRelations(id);
    if (!watcher) {
      throw new NotFoundError('Watcher', id);
    }
    return watcher;
  }

  /**
   * Create watcher
   * If a soft-deleted watcher with the same name exists, restore and update it
   */
  async create(request: CreateWatcherRequest, createdBy?: string): Promise<Watcher> {
    // Validate connection exists
    const connection = await this.connectionRepo.findById(request.source_connection_id);
    if (!connection) {
      throw new ValidationError(`Source connection ${request.source_connection_id} not found`);
    }

    // Validate schedule exists (if provided)
    if (request.schedule_id) {
      const schedule = await this.scheduleRepo.findById(request.schedule_id);
      if (!schedule) {
        throw new ValidationError(`Schedule ${request.schedule_id} not found`);
      }
    }

    // Check if a soft-deleted watcher with this name exists
    const deletedWatcher = await this.watcherRepo.findDeletedByName(request.name);

    if (deletedWatcher) {
      // Restore the soft-deleted watcher and update it with new values
      return this.watcherRepo.restore(deletedWatcher.id, {
        source_connection_id: request.source_connection_id,
        schedule_id: request.schedule_id,
        department_code: request.department_code,
        description: request.description,
        file_name_pattern: request.file_name_pattern,
        file_path_pattern: request.file_path_pattern,
        match_rule: request.match_rule ?? 'partial',
        sla_enabled: request.sla_enabled ?? false,
        sla_threshold_minutes: request.sla_threshold_minutes,
        direction: request.direction ?? 'inward',
        owner_team: request.owner_team,
        status: request.status ?? 'active',
        updated_by: createdBy,
      });
    }

    // No deleted watcher found, create a new one
    return this.watcherRepo.create<Watcher>({
      source_connection_id: request.source_connection_id,
      schedule_id: request.schedule_id,
      department_code: request.department_code,
      name: request.name,
      description: request.description,
      file_name_pattern: request.file_name_pattern,
      file_path_pattern: request.file_path_pattern,
      match_rule: request.match_rule ?? 'partial',
      last_check_status: 'never_run',
      last_files_detected: 0,
      sla_enabled: request.sla_enabled ?? false,
      sla_threshold_minutes: request.sla_threshold_minutes,
      direction: request.direction ?? 'inward',
      owner_team: request.owner_team,
      status: request.status ?? 'active',
      total_files_detected: 0,
      total_polls_succeeded: 0,
      total_polls_failed: 0,
      success_rate: 0,
      created_by: createdBy,
    });
  }

  /**
   * Update watcher
   */
  async update(
    id: number,
    request: UpdateWatcherRequest,
    updatedBy?: string
  ): Promise<Watcher> {
    await this.getById(id);

    // Validate connection if being changed
    if (request.source_connection_id) {
      const connection = await this.connectionRepo.findById(request.source_connection_id);
      if (!connection) {
        throw new ValidationError(`Source connection ${request.source_connection_id} not found`);
      }
    }

    // Validate schedule if being changed
    if (request.schedule_id) {
      const schedule = await this.scheduleRepo.findById(request.schedule_id);
      if (!schedule) {
        throw new ValidationError(`Schedule ${request.schedule_id} not found`);
      }
    }

    return this.watcherRepo.update<Watcher>(id, {
      ...request,
      updated_by: updatedBy,
    });
  }

  /**
   * Delete watcher (soft delete)
   */
  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.watcherRepo.softDelete(id);
  }

  /**
   * Update watcher status
   */
  async updateStatus(id: number, status: WatcherStatus): Promise<Watcher> {
    await this.getById(id);
    await this.watcherRepo.updateStatus(id, status);
    return this.getById(id);
  }

  /**
   * Get active watchers (for polling)
   */
  async getActive(): Promise<Watcher[]> {
    return this.watcherRepo.findActive();
  }

  /**
   * Get watchers by connection
   */
  async getByConnection(connectionId: number): Promise<Watcher[]> {
    return this.watcherRepo.findByConnectionId(connectionId);
  }

  /**
   * Get watchers by department
   */
  async getByDepartment(departmentCode: string): Promise<Watcher[]> {
    return this.watcherRepo.findByDepartment(departmentCode);
  }

  /**
   * Get watchers due for polling
   */
  async getDueForPolling(): Promise<Watcher[]> {
    return this.watcherRepo.findDueForPolling();
  }
}

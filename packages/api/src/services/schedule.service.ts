import {
  ScheduleRepository,
  ScheduleExclusionRepository,
  Schedule,
  ScheduleExclusion,
  ScheduleWithExclusions,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateScheduleExclusionRequest,
  FrequencyType,
} from '@omnitrackr/shared';
import { db } from '../config/database';
import { NotFoundError } from '../utils/errors';

/**
 * Schedule Service
 * Business logic for managing schedules and exclusions
 */
export class ScheduleService {
  private scheduleRepo: ScheduleRepository;
  private exclusionRepo: ScheduleExclusionRepository;

  constructor() {
    this.scheduleRepo = new ScheduleRepository(db);
    this.exclusionRepo = new ScheduleExclusionRepository(db);
  }

  /**
   * Get all schedules with pagination (filtered by organization)
   */
  async getAll(
    organizationId: number,
    page: number = 1,
    limit: number = 20,
    filters?: {
      frequency_type?: FrequencyType;
      enabled?: boolean;
    }
  ) {
    return this.scheduleRepo.findWithFilters({
      ...filters,
      organization_id: organizationId,
      page,
      limit,
    });
  }

  /**
   * Get schedule by ID (with organization ownership validation)
   */
  async getById(id: number, organizationId: number): Promise<Schedule> {
    const schedule = await this.scheduleRepo.findById<Schedule>(id);
    if (!schedule || schedule.deleted_at) {
      throw new NotFoundError('Schedule', id);
    }

    // Validate organization ownership
    if (schedule.organization_id !== organizationId) {
      throw new NotFoundError('Schedule', id);
    }

    return schedule;
  }

  /**
   * Get schedule with exclusions (with organization ownership validation)
   */
  async getWithExclusions(organizationId: number, id: number): Promise<ScheduleWithExclusions> {
    const schedule = await this.scheduleRepo.findWithExclusions(id);
    if (!schedule) {
      throw new NotFoundError('Schedule', id);
    }

    // Validate organization ownership
    if (schedule.organization_id !== organizationId) {
      throw new NotFoundError('Schedule', id);
    }

    return schedule;
  }

  /**
   * Create schedule
   * If a soft-deleted schedule with the same name exists, restore and update it
   */
  async create(organizationId: number, request: CreateScheduleRequest, createdBy?: string): Promise<Schedule> {
    // Check if a soft-deleted schedule with this name exists in this organization
    const deletedSchedule = await this.scheduleRepo.findDeletedByName(request.name);

    if (deletedSchedule && deletedSchedule.organization_id === organizationId) {
      // Restore the soft-deleted schedule and update it with new values
      return this.scheduleRepo.restore(deletedSchedule.id, {
        description: request.description,
        frequency_type: request.frequency_type,
        interval: request.interval ?? 1,
        execution_times: request.execution_times,
        days_of_week: request.days_of_week,
        day_of_month: request.day_of_month,
        week_of_month: request.week_of_month,
        timezone: request.timezone ?? 'UTC',
        valid_from: request.valid_from,
        valid_until: request.valid_until,
        enabled: request.enabled ?? true,
        updated_by: createdBy,
      });
    }

    // No deleted schedule found, create a new one
    return this.scheduleRepo.create<Schedule>({
      name: request.name,
      description: request.description,
      frequency_type: request.frequency_type,
      interval: request.interval ?? 1,
      execution_times: request.execution_times,
      days_of_week: request.days_of_week,
      day_of_month: request.day_of_month,
      week_of_month: request.week_of_month,
      timezone: request.timezone ?? 'UTC',
      valid_from: request.valid_from,
      valid_until: request.valid_until,
      enabled: request.enabled ?? true,
      organization_id: organizationId,
      created_by: createdBy,
    });
  }

  /**
   * Update schedule
   */
  async update(
    organizationId: number,
    id: number,
    request: UpdateScheduleRequest,
    updatedBy?: string
  ): Promise<Schedule> {
    await this.getById(id, organizationId); // Validate ownership

    return this.scheduleRepo.update<Schedule>(id, {
      ...request,
      updated_by: updatedBy,
    });
  }

  /**
   * Delete schedule (soft delete)
   */
  async delete(organizationId: number, id: number): Promise<void> {
    await this.getById(id, organizationId); // Validate ownership
    await this.scheduleRepo.softDelete(id);
  }

  /**
   * Toggle enabled status
   */
  async toggleEnabled(organizationId: number, id: number, enabled: boolean): Promise<Schedule> {
    await this.getById(id, organizationId); // Validate ownership
    return this.scheduleRepo.update<Schedule>(id, { enabled });
  }

  /**
   * Get active schedules (filtered by organization)
   */
  async getActive(organizationId: number): Promise<Schedule[]> {
    return this.scheduleRepo.findActive(organizationId);
  }

  // Exclusion methods

  /**
   * Add exclusion to schedule
   */
  async addExclusion(
    organizationId: number,
    request: CreateScheduleExclusionRequest,
    createdBy?: string
  ): Promise<ScheduleExclusion> {
    // Verify schedule exists and user owns it
    await this.getById(request.schedule_id, organizationId);

    return this.exclusionRepo.create<ScheduleExclusion>({
      schedule_id: request.schedule_id,
      exclusion_type: request.exclusion_type,
      excluded_date: request.excluded_date,
      excluded_from: request.excluded_from,
      excluded_to: request.excluded_to,
      holiday_calendar_code: request.holiday_calendar_code,
      reason: request.reason,
      created_by: createdBy,
    });
  }

  /**
   * Get exclusions for schedule
   */
  async getExclusions(organizationId: number, scheduleId: number): Promise<ScheduleExclusion[]> {
    await this.getById(scheduleId, organizationId); // Validate ownership
    return this.exclusionRepo.findByScheduleId(scheduleId);
  }

  /**
   * Delete exclusion
   */
  async deleteExclusion(organizationId: number, exclusionId: number): Promise<void> {
    // First get the exclusion to find its schedule
    const exclusion = await db('schedule_exclusions').where({ id: exclusionId }).first();
    if (!exclusion) {
      throw new NotFoundError('Schedule Exclusion', exclusionId);
    }

    // Validate that the schedule belongs to the user's organization
    await this.getById(exclusion.schedule_id, organizationId);

    const deleted = await this.exclusionRepo.delete(exclusionId);
    if (!deleted) {
      throw new NotFoundError('Schedule Exclusion', exclusionId);
    }
  }

  /**
   * Check if date is excluded
   */
  async isDateExcluded(scheduleId: number, date: Date): Promise<boolean> {
    const exclusions = await this.exclusionRepo.findForDate(scheduleId, date);
    return exclusions.length > 0;
  }
}

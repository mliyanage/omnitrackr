import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import {
  Schedule,
  ScheduleExclusion,
  FrequencyType,
  ScheduleWithExclusions,
} from '../types';

/**
 * Schedule Repository
 * Handles all database operations for schedules table
 */
export class ScheduleRepository extends BaseRepository {
  protected get tableName(): string {
    return 'schedules';
  }

  /**
   * Find schedules by frequency type
   */
  async findByFrequencyType(frequencyType: FrequencyType): Promise<Schedule[]> {
    return this.db(this.tableName)
      .where({ frequency_type: frequencyType, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find enabled schedules
   */
  async findEnabled(): Promise<Schedule[]> {
    return this.db(this.tableName)
      .where({ enabled: true, deleted_at: null })
      .orderBy('name', 'asc');
  }

  /**
   * Find active schedules (enabled and within valid period)
   */
  async findActive(organizationId: number, currentTime: Date = new Date()): Promise<Schedule[]> {
    return this.db(this.tableName)
      .where({ enabled: true, deleted_at: null, organization_id: organizationId })
      .andWhere(function () {
        this.whereNull('valid_from').orWhere('valid_from', '<=', currentTime);
      })
      .andWhere(function () {
        this.whereNull('valid_until').orWhere('valid_until', '>=', currentTime);
      })
      .orderBy('name', 'asc');
  }

  /**
   * Find schedule with exclusions
   */
  async findWithExclusions(id: number): Promise<ScheduleWithExclusions | undefined> {
    const schedule = await this.db(this.tableName)
      .where({ id, deleted_at: null })
      .first();

    if (!schedule) return undefined;

    const exclusions = await this.db('schedule_exclusions')
      .where({ schedule_id: id })
      .orderBy('created_at', 'desc');

    return {
      ...schedule,
      exclusions,
    };
  }

  /**
   * Soft delete schedule
   */
  async softDelete(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Find soft-deleted schedule by name
   */
  async findDeletedByName(name: string): Promise<Schedule | undefined> {
    return this.db(this.tableName)
      .whereRaw('LOWER(name) = LOWER(?)', [name])
      .whereNotNull('deleted_at')
      .first();
  }

  /**
   * Restore soft-deleted schedule and update its values
   */
  async restore(id: number, updateData: Partial<Schedule>): Promise<Schedule> {
    const [result] = await this.db(this.tableName)
      .where({ id })
      .update({
        ...updateData,
        deleted_at: null,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return result;
  }

  /**
   * Find with pagination
   */
  async findWithFilters(options: {
    frequency_type?: FrequencyType;
    enabled?: boolean;
    organization_id?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Schedule[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const filters: any = { deleted_at: null };
    if (options.frequency_type) filters.frequency_type = options.frequency_type;
    if (options.enabled !== undefined) filters.enabled = options.enabled;
    if (options.organization_id) filters.organization_id = options.organization_id;

    return this.paginate({
      filters,
      page: options.page,
      limit: options.limit,
      orderBy: 'name',
      orderDirection: 'asc',
    });
  }
}

/**
 * Schedule Exclusion Repository
 * Handles database operations for schedule_exclusions table
 */
export class ScheduleExclusionRepository extends BaseRepository {
  protected get tableName(): string {
    return 'schedule_exclusions';
  }

  /**
   * Find exclusions by schedule
   */
  async findByScheduleId(scheduleId: number): Promise<ScheduleExclusion[]> {
    return this.db(this.tableName)
      .where({ schedule_id: scheduleId })
      .orderBy('created_at', 'desc');
  }

  /**
   * Find exclusions for a specific date
   */
  async findForDate(scheduleId: number, date: Date): Promise<ScheduleExclusion[]> {
    const dateStr = date.toISOString().split('T')[0];

    return this.db(this.tableName)
      .where({ schedule_id: scheduleId })
      .andWhere(function () {
        // Specific date match
        this.where('excluded_date', dateStr)
          // Or date range match
          .orWhere(function () {
            this.where('excluded_from', '<=', dateStr)
              .andWhere('excluded_to', '>=', dateStr);
          });
      });
  }

  /**
   * Delete all exclusions for a schedule
   */
  async deleteByScheduleId(scheduleId: number): Promise<number> {
    return this.db(this.tableName)
      .where({ schedule_id: scheduleId })
      .del();
  }

  /**
   * Find by holiday calendar code
   */
  async findByCalendarCode(calendarCode: string): Promise<ScheduleExclusion[]> {
    return this.db(this.tableName)
      .where({ holiday_calendar_code: calendarCode })
      .orderBy('schedule_id', 'asc');
  }
}

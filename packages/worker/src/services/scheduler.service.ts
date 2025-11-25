import { DateTime } from 'luxon';
import { Knex } from 'knex';
import {
  Schedule,
  ScheduleExclusion,
  ScheduleRepository,
  ScheduleExclusionRepository,
} from '@omnitrackr/shared';

/**
 * Scheduler Service
 * Calculates next run times for schedules based on complex patterns
 * Handles timezone conversions and exclusions
 */
export class SchedulerService {
  private scheduleRepo: ScheduleRepository;
  private exclusionRepo: ScheduleExclusionRepository;

  constructor(db: Knex) {
    this.scheduleRepo = new ScheduleRepository(db);
    this.exclusionRepo = new ScheduleExclusionRepository(db);
  }

  /**
   * Calculate next run time for a schedule
   * @param schedule The schedule configuration
   * @param from Start calculating from this time (defaults to now)
   * @returns Next execution time in UTC, or null if schedule is disabled
   */
  async calculateNextRunTime(
    schedule: Schedule,
    from: Date = new Date()
  ): Promise<Date | null> {
    if (!schedule.enabled) {
      return null;
    }

    // Convert 'from' to schedule's timezone
    const fromDateTime = DateTime.fromJSDate(from, {
      zone: schedule.timezone || 'UTC',
    });

    // Calculate base next run time based on frequency type
    let nextRun: DateTime | null = null;

    switch (schedule.frequency_type) {
      case 'minutely':
        nextRun = this.calculateMinutely(schedule, fromDateTime);
        break;
      case 'hourly':
        nextRun = this.calculateHourly(schedule, fromDateTime);
        break;
      case 'daily':
        nextRun = this.calculateDaily(schedule, fromDateTime);
        break;
      case 'weekly':
        nextRun = this.calculateWeekly(schedule, fromDateTime);
        break;
      case 'monthly':
        nextRun = this.calculateMonthly(schedule, fromDateTime);
        break;
      case 'yearly':
        nextRun = this.calculateYearly(schedule, fromDateTime);
        break;
      default:
        throw new Error(`Unsupported frequency type: ${schedule.frequency_type}`);
    }

    if (!nextRun) {
      return null;
    }

    // Check valid_from and valid_until constraints
    if (schedule.valid_from && nextRun < DateTime.fromJSDate(schedule.valid_from)) {
      nextRun = DateTime.fromJSDate(schedule.valid_from, {
        zone: schedule.timezone || 'UTC',
      });
    }

    if (schedule.valid_until && nextRun > DateTime.fromJSDate(schedule.valid_until)) {
      return null; // Schedule has expired
    }

    // Skip exclusions (holidays, blackouts)
    nextRun = await this.skipExclusions(schedule, nextRun);

    if (!nextRun) {
      return null;
    }

    // Convert back to UTC Date object
    return nextRun.toUTC().toJSDate();
  }

  /**
   * Calculate next run for minutely frequency
   */
  private calculateMinutely(schedule: Schedule, from: DateTime): DateTime {
    const interval = schedule.interval || 1;
    return from.plus({ minutes: interval });
  }

  /**
   * Calculate next run for hourly frequency
   */
  private calculateHourly(schedule: Schedule, from: DateTime): DateTime {
    const interval = schedule.interval || 1;
    return from.plus({ hours: interval });
  }

  /**
   * Calculate next run for daily frequency
   */
  private calculateDaily(schedule: Schedule, from: DateTime): DateTime {
    const interval = schedule.interval || 1;
    const executionTimes = schedule.execution_times || ['00:00'];

    // Find next execution time today or tomorrow
    for (const timeStr of executionTimes) {
      const [hour, minute] = timeStr.split(':').map(Number);
      const candidate = from.set({ hour, minute, second: 0, millisecond: 0 });

      if (candidate > from) {
        return candidate;
      }
    }

    // No time found today, move to next day at first execution time
    const [hour, minute] = executionTimes[0].split(':').map(Number);
    return from
      .plus({ days: interval })
      .set({ hour, minute, second: 0, millisecond: 0 });
  }

  /**
   * Calculate next run for weekly frequency
   */
  private calculateWeekly(schedule: Schedule, from: DateTime): DateTime {
    const daysOfWeek = schedule.days_of_week || [1]; // Default to Monday
    const executionTimes = schedule.execution_times || ['00:00'];

    // Try each execution time for the rest of today
    if (daysOfWeek.includes(from.weekday)) {
      for (const timeStr of executionTimes) {
        const [hour, minute] = timeStr.split(':').map(Number);
        const candidate = from.set({ hour, minute, second: 0, millisecond: 0 });

        if (candidate > from) {
          return candidate;
        }
      }
    }

    // Find next occurrence of the target weekdays
    for (let i = 1; i <= 7; i++) {
      const candidate = from.plus({ days: i });
      if (daysOfWeek.includes(candidate.weekday)) {
        const [hour, minute] = executionTimes[0].split(':').map(Number);
        return candidate.set({ hour, minute, second: 0, millisecond: 0 });
      }
    }

    // Fallback (should never reach here)
    return from.plus({ weeks: 1 });
  }

  /**
   * Calculate next run for monthly frequency
   */
  private calculateMonthly(schedule: Schedule, from: DateTime): DateTime {
    const executionTimes = schedule.execution_times || ['00:00'];
    const [hour, minute] = executionTimes[0].split(':').map(Number);

    if (schedule.day_of_month) {
      // Specific day of month (e.g., "1st", "15th", "last")
      return this.nextOccurrenceOfDayOfMonth(
        from,
        schedule.day_of_month,
        hour,
        minute
      );
    } else if (schedule.week_of_month && schedule.days_of_week) {
      // Specific week and day (e.g., "2nd Tuesday", "Last Friday")
      return this.nextOccurrenceOfWeekOfMonth(
        from,
        schedule.week_of_month[0],
        schedule.days_of_week[0],
        hour,
        minute
      );
    } else {
      // Default to first of month
      const candidate = from.set({
        day: 1,
        hour,
        minute,
        second: 0,
        millisecond: 0,
      });

      if (candidate > from) {
        return candidate;
      }

      return candidate.plus({ months: 1 });
    }
  }

  /**
   * Calculate next run for yearly frequency
   */
  private calculateYearly(schedule: Schedule, from: DateTime): DateTime {
    const executionTimes = schedule.execution_times || ['00:00'];
    const [hour, minute] = executionTimes[0].split(':').map(Number);

    // For yearly, we need month and day
    // For now, default to January 1st
    const candidate = from.set({
      month: 1,
      day: 1,
      hour,
      minute,
      second: 0,
      millisecond: 0,
    });

    if (candidate > from) {
      return candidate;
    }

    return candidate.plus({ years: 1 });
  }

  /**
   * Find next occurrence of a specific day of month
   */
  private nextOccurrenceOfDayOfMonth(
    from: DateTime,
    dayOfMonth: number,
    hour: number,
    minute: number
  ): DateTime {
    // Handle special case: -1 means last day of month
    if (dayOfMonth === -1) {
      let candidate = from.set({
        day: from.daysInMonth,
        hour,
        minute,
        second: 0,
        millisecond: 0,
      });

      if (candidate > from) {
        return candidate;
      }

      // Move to next month and set to last day
      candidate = candidate.plus({ months: 1 });
      return candidate.set({ day: candidate.daysInMonth });
    }

    let candidate = from.set({
      day: dayOfMonth,
      hour,
      minute,
      second: 0,
      millisecond: 0,
    });

    // Handle "last day of month" (day 31 might not exist)
    if (dayOfMonth > candidate.daysInMonth) {
      candidate = candidate.set({ day: candidate.daysInMonth });
    }

    if (candidate > from) {
      return candidate;
    }

    // Move to next month
    candidate = candidate.plus({ months: 1 });
    if (dayOfMonth > candidate.daysInMonth) {
      candidate = candidate.set({ day: candidate.daysInMonth });
    }

    return candidate;
  }

  /**
   * Find next occurrence of "Nth weekday of month" (e.g., "2nd Tuesday")
   */
  private nextOccurrenceOfWeekOfMonth(
    from: DateTime,
    weekOfMonth: number,
    dayOfWeek: number,
    hour: number,
    minute: number
  ): DateTime {
    // Start from the first of this month
    let candidate = from.startOf('month');

    // Find the Nth occurrence of the target weekday
    let occurrences = 0;
    while (occurrences < weekOfMonth) {
      if (candidate.weekday === dayOfWeek) {
        occurrences++;
        if (occurrences === weekOfMonth) {
          candidate = candidate.set({ hour, minute, second: 0, millisecond: 0 });
          break;
        }
      }
      candidate = candidate.plus({ days: 1 });

      // Safety: Don't go past end of month
      if (candidate.month !== from.month) {
        // Move to next month
        candidate = from.plus({ months: 1 }).startOf('month');
        occurrences = 0;
      }
    }

    if (candidate > from) {
      return candidate;
    }

    // Not found this month, try next month
    return this.nextOccurrenceOfWeekOfMonth(
      from.plus({ months: 1 }).startOf('month'),
      weekOfMonth,
      dayOfWeek,
      hour,
      minute
    );
  }

  /**
   * Skip exclusions (holidays, blackout dates)
   * If the calculated next run falls on an excluded date, find the next non-excluded date
   */
  private async skipExclusions(
    schedule: Schedule,
    nextRun: DateTime
  ): Promise<DateTime | null> {
    const exclusions = await this.exclusionRepo.findByScheduleId(schedule.id);

    if (exclusions.length === 0) {
      return nextRun;
    }

    // Check if nextRun falls on any exclusion
    let current = nextRun;
    let attempts = 0;
    const maxAttempts = 365; // Prevent infinite loop

    while (attempts < maxAttempts) {
      const isExcluded = this.isDateExcluded(current, exclusions);

      if (!isExcluded) {
        return current;
      }

      // Move to next day and recalculate
      current = await this.calculateNextRunTime(
        schedule,
        current.plus({ days: 1 }).toJSDate()
      ).then((date) => (date ? DateTime.fromJSDate(date, { zone: schedule.timezone }) : null)) as DateTime;

      if (!current) {
        return null;
      }

      attempts++;
    }

    console.warn(
      `Could not find non-excluded date for schedule ${schedule.id} after ${maxAttempts} attempts`
    );
    return null;
  }

  /**
   * Check if a date is excluded
   */
  private isDateExcluded(
    date: DateTime,
    exclusions: ScheduleExclusion[]
  ): boolean {
    for (const exclusion of exclusions) {
      if (exclusion.excluded_date) {
        // Single date exclusion
        const excludedDate = DateTime.fromJSDate(exclusion.excluded_date, {
          zone: date.zone,
        });
        if (date.hasSame(excludedDate, 'day')) {
          return true;
        }
      } else if (exclusion.excluded_from && exclusion.excluded_to) {
        // Date range exclusion
        const from = DateTime.fromJSDate(exclusion.excluded_from, {
          zone: date.zone,
        });
        const to = DateTime.fromJSDate(exclusion.excluded_to, {
          zone: date.zone,
        });

        if (date >= from && date <= to) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a watcher should run now
   * @param schedule The schedule to check
   * @param lastRunTime When the watcher last ran
   * @returns true if it's time to run
   */
  async shouldRunNow(
    schedule: Schedule,
    lastRunTime: Date | null
  ): Promise<boolean> {
    if (!schedule.enabled) {
      return false;
    }

    const now = new Date();

    if (!lastRunTime) {
      // Never run before - run now
      return true;
    }

    const nextRun = await this.calculateNextRunTime(schedule, lastRunTime);

    if (!nextRun) {
      return false;
    }

    return nextRun <= now;
  }
}

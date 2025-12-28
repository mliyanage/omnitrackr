import { Knex } from 'knex';
import { Schedule } from '@omnitrackr/shared';
/**
 * Scheduler Service
 * Calculates next run times for schedules based on complex patterns
 * Handles timezone conversions and exclusions
 */
export declare class SchedulerService {
    private scheduleRepo;
    private exclusionRepo;
    constructor(db: Knex);
    /**
     * Calculate next run time for a schedule
     * @param schedule The schedule configuration
     * @param from Start calculating from this time (defaults to now)
     * @returns Next execution time in UTC, or null if schedule is disabled
     */
    calculateNextRunTime(schedule: Schedule, from?: Date): Promise<Date | null>;
    /**
     * Calculate next run for minutely frequency
     * Aligns to fixed intervals (e.g., :00, :15, :30, :45 for 15-min interval)
     * to prevent duplicate record creation
     */
    private calculateMinutely;
    /**
     * Calculate next run for hourly frequency
     * Aligns to fixed hour intervals
     */
    private calculateHourly;
    /**
     * Calculate next run for daily frequency
     */
    private calculateDaily;
    /**
     * Calculate next run for weekly frequency
     */
    private calculateWeekly;
    /**
     * Calculate next run for monthly frequency
     */
    private calculateMonthly;
    /**
     * Calculate next run for yearly frequency
     */
    private calculateYearly;
    /**
     * Find next occurrence of a specific day of month
     */
    private nextOccurrenceOfDayOfMonth;
    /**
     * Find next occurrence of "Nth weekday of month" (e.g., "2nd Tuesday")
     */
    private nextOccurrenceOfWeekOfMonth;
    /**
     * Skip exclusions (holidays, blackout dates)
     * If the calculated next run falls on an excluded date, find the next non-excluded date
     */
    private skipExclusions;
    /**
     * Check if a date is excluded
     */
    private isDateExcluded;
    /**
     * Check if a watcher should run now
     * @param schedule The schedule to check
     * @param lastRunTime When the watcher last ran
     * @returns true if it's time to run
     */
    shouldRunNow(schedule: Schedule, lastRunTime: Date | null): Promise<boolean>;
}
//# sourceMappingURL=scheduler.service.d.ts.map
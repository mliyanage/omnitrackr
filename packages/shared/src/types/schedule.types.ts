/**
 * Schedule Types
 * Shared types for reusable scheduling rules
 */

// Enums matching database types
export type FrequencyType = 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ExclusionType = 'specific_date' | 'date_range' | 'holiday_calendar';

/**
 * Schedule Entity (database model)
 */
export interface Schedule {
  id: number;
  name: string;
  description?: string | null;

  // Frequency Configuration
  frequency_type: FrequencyType;
  interval: number;

  // Time Configuration
  execution_times?: string[] | null; // ['09:00', '14:00', '18:00']

  // Day-based Rules
  days_of_week?: number[] | null; // [1,2,3,4,5] = Mon-Fri
  day_of_month?: number | null; // 1-31
  week_of_month?: number[] | null; // [1,-1] = first and last week

  // Timezone
  timezone: string;

  // Active Period
  valid_from?: Date | null;
  valid_until?: Date | null;

  // Status
  enabled: boolean;

  // Audit
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: Date | null;
}

/**
 * Schedule Exclusion Entity (database model)
 */
export interface ScheduleExclusion {
  id: number;
  schedule_id: number;
  exclusion_type: ExclusionType;

  // Date Exclusions
  excluded_date?: Date | null;
  excluded_from?: Date | null;
  excluded_to?: Date | null;

  // Holiday Calendar
  holiday_calendar_code?: string | null;

  // Metadata
  reason?: string | null;

  // Audit
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
}

/**
 * Create Schedule Request
 */
export interface CreateScheduleRequest {
  name: string;
  description?: string;
  frequency_type: FrequencyType;
  interval?: number;
  execution_times?: string[];
  days_of_week?: number[];
  day_of_month?: number;
  week_of_month?: number[];
  timezone?: string;
  valid_from?: Date;
  valid_until?: Date;
  enabled?: boolean;
}

/**
 * Update Schedule Request
 */
export interface UpdateScheduleRequest {
  name?: string;
  description?: string;
  frequency_type?: FrequencyType;
  interval?: number;
  execution_times?: string[];
  days_of_week?: number[];
  day_of_month?: number;
  week_of_month?: number[];
  timezone?: string;
  valid_from?: Date;
  valid_until?: Date;
  enabled?: boolean;
}

/**
 * Create Schedule Exclusion Request
 */
export interface CreateScheduleExclusionRequest {
  schedule_id: number;
  exclusion_type: ExclusionType;
  excluded_date?: Date;
  excluded_from?: Date;
  excluded_to?: Date;
  holiday_calendar_code?: string;
  reason?: string;
}

/**
 * Schedule with Exclusions
 */
export interface ScheduleWithExclusions extends Schedule {
  exclusions: ScheduleExclusion[];
}

/**
 * Next Execution Result
 */
export interface NextExecutionResult {
  next_execution: Date;
  is_excluded: boolean;
  exclusion_reason?: string;
}

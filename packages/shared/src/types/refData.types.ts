/**
 * Reference Data Types
 * Shared types for generic reference/lookup data
 */

/**
 * Reference Data Entity (database model)
 */
export interface RefData {
  id: number;
  code: string;
  value1?: string | null;
  value2?: string | null;
  value3?: string | null;
  value4?: string | null;
  value5?: string | null;
  metadata?: Record<string, any> | null;

  // Audit
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;
}

/**
 * Create Reference Data Request
 */
export interface CreateRefDataRequest {
  code: string;
  value1?: string;
  value2?: string;
  value3?: string;
  value4?: string;
  value5?: string;
  metadata?: Record<string, any>;
}

/**
 * Update Reference Data Request
 */
export interface UpdateRefDataRequest {
  value1?: string;
  value2?: string;
  value3?: string;
  value4?: string;
  value5?: string;
  metadata?: Record<string, any>;
}

/**
 * Department Reference Data
 */
export interface Department {
  code: string;
  name: string;
  abbreviation: string;
  description?: string;
}

/**
 * Timezone Reference Data
 */
export interface TimezoneRef {
  code: string;
  iana_name: string;
  display_name: string;
  utc_offset: string;
}

/**
 * Holiday Reference Data
 */
export interface HolidayRef {
  code: string;
  date: string;
  name: string;
  type: string;
}

/**
 * SLA Threshold Reference Data
 */
export interface SLAThresholdRef {
  code: string;
  minutes: number;
  unit: string;
  description: string;
}

/**
 * Reference Data Query Options
 */
export interface RefDataQueryOptions {
  code_prefix?: string; // e.g., 'DEPARTMENT:', 'HOLIDAY_US_2025:'
  page?: number;
  limit?: number;
}

/**
 * Helper to parse department from ref_data
 */
export function parseDepartment(refData: RefData): Department {
  return {
    code: refData.code,
    name: refData.value1 || '',
    abbreviation: refData.value2 || '',
    description: refData.metadata?.description,
  };
}

/**
 * Helper to parse timezone from ref_data
 */
export function parseTimezone(refData: RefData): TimezoneRef {
  return {
    code: refData.code,
    iana_name: refData.value1 || '',
    display_name: refData.value2 || '',
    utc_offset: refData.value3 || '',
  };
}

/**
 * Helper to parse holiday from ref_data
 */
export function parseHoliday(refData: RefData): HolidayRef {
  return {
    code: refData.code,
    date: refData.value1 || '',
    name: refData.value2 || '',
    type: refData.value3 || '',
  };
}

/**
 * Helper to parse SLA threshold from ref_data
 */
export function parseSLAThreshold(refData: RefData): SLAThresholdRef {
  return {
    code: refData.code,
    minutes: parseInt(refData.value1 || '0', 10),
    unit: refData.value2 || 'minutes',
    description: refData.value3 || '',
  };
}

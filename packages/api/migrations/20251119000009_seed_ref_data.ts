import { Knex } from 'knex';

/**
 * Migration: Seed initial reference data
 * Populates ref_data with departments, default schedules, and holiday calendars
 */
export async function up(knex: Knex): Promise<void> {
  // Delete existing department data first to avoid duplicates
  await knex('ref_data').where('code', 'like', 'DEPARTMENT:%').delete();

  // Seed departments (using full name in code for consistency)
  await knex('ref_data').insert([
    {
      code: 'DEPARTMENT:Finance',
      value1: 'Finance',
      value2: 'FIN',
      metadata: JSON.stringify({
        description: 'Finance Department',
        is_active: true,
        sort_order: 1
      }),
      created_by: 'system',
    },
    {
      code: 'DEPARTMENT:Operations',
      value1: 'Operations',
      value2: 'OPS',
      metadata: JSON.stringify({
        description: 'Operations Department',
        is_active: true,
        sort_order: 2
      }),
      created_by: 'system',
    },
    {
      code: 'DEPARTMENT:Information Technology',
      value1: 'Information Technology',
      value2: 'IT',
      metadata: JSON.stringify({
        description: 'IT Department',
        is_active: true,
        sort_order: 3
      }),
      created_by: 'system',
    },
    {
      code: 'DEPARTMENT:Human Resources',
      value1: 'Human Resources',
      value2: 'HR',
      metadata: JSON.stringify({
        description: 'Human Resources Department',
        is_active: true,
        sort_order: 4
      }),
      created_by: 'system',
    },
    {
      code: 'DEPARTMENT:Sales',
      value1: 'Sales',
      value2: 'SALES',
      metadata: JSON.stringify({
        description: 'Sales Department',
        is_active: true,
        sort_order: 5
      }),
      created_by: 'system',
    },
  ]);

  // Delete existing timezone data
  await knex('ref_data').where('code', 'like', 'TIMEZONE:%').delete();

  // Seed common timezones
  await knex('ref_data').insert([
    {
      code: 'TIMEZONE:UTC',
      value1: 'UTC',
      value2: 'Coordinated Universal Time',
      value3: '+00:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:EST',
      value1: 'America/New_York',
      value2: 'Eastern Time',
      value3: '-05:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:PST',
      value1: 'America/Los_Angeles',
      value2: 'Pacific Time',
      value3: '-08:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:CST',
      value1: 'America/Chicago',
      value2: 'Central Time',
      value3: '-06:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:GMT',
      value1: 'Europe/London',
      value2: 'Greenwich Mean Time',
      value3: '+00:00',
      created_by: 'system',
    },
  ]);

  // Delete existing SLA threshold data
  await knex('ref_data').where('code', 'like', 'SLA_THRESHOLD:%').delete();

  // Seed SLA threshold presets
  await knex('ref_data').insert([
    {
      code: 'SLA_THRESHOLD:CRITICAL',
      value1: '30',
      value2: 'minutes',
      value3: 'Critical files - immediate attention required',
      created_by: 'system',
    },
    {
      code: 'SLA_THRESHOLD:HIGH',
      value1: '60',
      value2: 'minutes',
      value3: 'High priority files',
      created_by: 'system',
    },
    {
      code: 'SLA_THRESHOLD:STANDARD',
      value1: '120',
      value2: 'minutes',
      value3: 'Standard priority files',
      created_by: 'system',
    },
    {
      code: 'SLA_THRESHOLD:LOW',
      value1: '240',
      value2: 'minutes',
      value3: 'Low priority files',
      created_by: 'system',
    },
  ]);

  // Delete existing holiday data for 2025
  await knex('ref_data').where('code', 'like', 'HOLIDAY_US_2025:%').delete();

  // Seed US Federal Holidays 2025
  await knex('ref_data').insert([
    {
      code: 'HOLIDAY_US_2025:NewYear',
      value1: '2025-01-01',
      value2: 'New Year\'s Day',
      value3: 'Federal',
      created_by: 'system',
    },
    {
      code: 'HOLIDAY_US_2025:MLK',
      value1: '2025-01-20',
      value2: 'Martin Luther King Jr. Day',
      value3: 'Federal',
      created_by: 'system',
    },
    {
      code: 'HOLIDAY_US_2025:Presidents',
      value1: '2025-02-17',
      value2: 'Presidents\' Day',
      value3: 'Federal',
      created_by: 'system',
    },
    {
      code: 'HOLIDAY_US_2025:Memorial',
      value1: '2025-05-26',
      value2: 'Memorial Day',
      value3: 'Federal',
      created_by: 'system',
    },
    {
      code: 'HOLIDAY_US_2025:Independence',
      value1: '2025-07-04',
      value2: 'Independence Day',
      value3: 'Federal',
      created_by: 'system',
    },
    {
      code: 'HOLIDAY_US_2025:Labor',
      value1: '2025-09-01',
      value2: 'Labor Day',
      value3: 'Federal',
      created_by: 'system',
    },
    {
      code: 'HOLIDAY_US_2025:Columbus',
      value1: '2025-10-13',
      value2: 'Columbus Day',
      value3: 'Federal',
      created_by: 'system',
    },
    {
      code: 'HOLIDAY_US_2025:Veterans',
      value1: '2025-11-11',
      value2: 'Veterans Day',
      value3: 'Federal',
      created_by: 'system',
    },
    {
      code: 'HOLIDAY_US_2025:Thanksgiving',
      value1: '2025-11-27',
      value2: 'Thanksgiving Day',
      value3: 'Federal',
      created_by: 'system',
    },
    {
      code: 'HOLIDAY_US_2025:Christmas',
      value1: '2025-12-25',
      value2: 'Christmas Day',
      value3: 'Federal',
      created_by: 'system',
    },
  ]);

  // Delete existing system schedules
  await knex('schedules').where('created_by', 'system').delete();

  // Create default schedules
  await knex('schedules').insert([
    {
      name: 'Every 15 minutes',
      description: 'Poll every 15 minutes continuously',
      frequency_type: 'minutely',
      interval: 15,
      timezone: 'UTC',
      enabled: true,
      created_by: 'system',
    },
    {
      name: 'Every 30 minutes',
      description: 'Poll every 30 minutes continuously',
      frequency_type: 'minutely',
      interval: 30,
      timezone: 'UTC',
      enabled: true,
      created_by: 'system',
    },
    {
      name: 'Hourly',
      description: 'Poll once every hour',
      frequency_type: 'hourly',
      interval: 1,
      timezone: 'UTC',
      enabled: true,
      created_by: 'system',
    },
    {
      name: 'Daily at 9am EST',
      description: 'Run once daily at 9:00 AM Eastern Time',
      frequency_type: 'daily',
      interval: 1,
      execution_times: ['09:00'],
      timezone: 'America/New_York',
      enabled: true,
      created_by: 'system',
    },
    {
      name: 'Weekdays at 9am',
      description: 'Run Monday through Friday at 9:00 AM',
      frequency_type: 'weekly',
      interval: 1,
      execution_times: ['09:00'],
      days_of_week: [1, 2, 3, 4, 5],
      timezone: 'UTC',
      enabled: true,
      created_by: 'system',
    },
    {
      name: 'Business Hours (3x daily)',
      description: 'Run at 9am, 2pm, and 6pm on weekdays',
      frequency_type: 'weekly',
      interval: 1,
      execution_times: ['09:00', '14:00', '18:00'],
      days_of_week: [1, 2, 3, 4, 5],
      timezone: 'America/New_York',
      enabled: true,
      created_by: 'system',
    },
    {
      name: 'First of Month',
      description: 'Run on the first day of each month at midnight',
      frequency_type: 'monthly',
      interval: 1,
      execution_times: ['00:00'],
      day_of_month: 1,
      timezone: 'UTC',
      enabled: true,
      created_by: 'system',
    },
  ]);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  // Delete seeded schedules
  await knex('schedules').where('created_by', 'system').delete();

  // Delete seeded ref_data
  await knex('ref_data').where('created_by', 'system').delete();
}

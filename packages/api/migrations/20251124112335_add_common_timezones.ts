import { Knex } from 'knex';

/**
 * Migration: Add comprehensive list of common timezones
 * Adds commonly used timezones across different regions
 */
export async function up(knex: Knex): Promise<void> {
  // Add more comprehensive timezone data
  await knex('ref_data').insert([
    // Americas
    {
      code: 'TIMEZONE:MST',
      value1: 'America/Denver',
      value2: 'Mountain Time',
      value3: '-07:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:AKST',
      value1: 'America/Anchorage',
      value2: 'Alaska Time',
      value3: '-09:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:HST',
      value1: 'Pacific/Honolulu',
      value2: 'Hawaii Time',
      value3: '-10:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:AST',
      value1: 'America/Halifax',
      value2: 'Atlantic Time',
      value3: '-04:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:BRT',
      value1: 'America/Sao_Paulo',
      value2: 'Brasilia Time',
      value3: '-03:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:ART',
      value1: 'America/Argentina/Buenos_Aires',
      value2: 'Argentina Time',
      value3: '-03:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:CLT',
      value1: 'America/Santiago',
      value2: 'Chile Time',
      value3: '-03:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:COT',
      value1: 'America/Bogota',
      value2: 'Colombia Time',
      value3: '-05:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:MEX',
      value1: 'America/Mexico_City',
      value2: 'Mexico City Time',
      value3: '-06:00',
      created_by: 'system',
    },
    // Europe
    {
      code: 'TIMEZONE:CET',
      value1: 'Europe/Paris',
      value2: 'Central European Time',
      value3: '+01:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:EET',
      value1: 'Europe/Athens',
      value2: 'Eastern European Time',
      value3: '+02:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:IST_DUBLIN',
      value1: 'Europe/Dublin',
      value2: 'Irish Standard Time',
      value3: '+00:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:MSK',
      value1: 'Europe/Moscow',
      value2: 'Moscow Time',
      value3: '+03:00',
      created_by: 'system',
    },
    // Asia
    {
      code: 'TIMEZONE:IST',
      value1: 'Asia/Kolkata',
      value2: 'India Standard Time',
      value3: '+05:30',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:CST_CHINA',
      value1: 'Asia/Shanghai',
      value2: 'China Standard Time',
      value3: '+08:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:JST',
      value1: 'Asia/Tokyo',
      value2: 'Japan Standard Time',
      value3: '+09:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:KST',
      value1: 'Asia/Seoul',
      value2: 'Korea Standard Time',
      value3: '+09:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:SGT',
      value1: 'Asia/Singapore',
      value2: 'Singapore Time',
      value3: '+08:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:HKT',
      value1: 'Asia/Hong_Kong',
      value2: 'Hong Kong Time',
      value3: '+08:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:ICT',
      value1: 'Asia/Bangkok',
      value2: 'Indochina Time',
      value3: '+07:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:WIB',
      value1: 'Asia/Jakarta',
      value2: 'Western Indonesia Time',
      value3: '+07:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:PHT',
      value1: 'Asia/Manila',
      value2: 'Philippine Time',
      value3: '+08:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:GST',
      value1: 'Asia/Dubai',
      value2: 'Gulf Standard Time',
      value3: '+04:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:PKT',
      value1: 'Asia/Karachi',
      value2: 'Pakistan Standard Time',
      value3: '+05:00',
      created_by: 'system',
    },
    // Australia & Pacific
    {
      code: 'TIMEZONE:AEST',
      value1: 'Australia/Sydney',
      value2: 'Australian Eastern Time',
      value3: '+10:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:ACST',
      value1: 'Australia/Adelaide',
      value2: 'Australian Central Time',
      value3: '+09:30',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:AWST',
      value1: 'Australia/Perth',
      value2: 'Australian Western Time',
      value3: '+08:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:NZST',
      value1: 'Pacific/Auckland',
      value2: 'New Zealand Standard Time',
      value3: '+12:00',
      created_by: 'system',
    },
    // Africa
    {
      code: 'TIMEZONE:SAST',
      value1: 'Africa/Johannesburg',
      value2: 'South Africa Standard Time',
      value3: '+02:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:EAT',
      value1: 'Africa/Nairobi',
      value2: 'East Africa Time',
      value3: '+03:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:WAT',
      value1: 'Africa/Lagos',
      value2: 'West Africa Time',
      value3: '+01:00',
      created_by: 'system',
    },
    {
      code: 'TIMEZONE:EGY',
      value1: 'Africa/Cairo',
      value2: 'Egypt Time',
      value3: '+02:00',
      created_by: 'system',
    },
  ]);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  // Remove the newly added timezones (keep the original 5)
  const timezoneCodes = [
    'TIMEZONE:MST', 'TIMEZONE:AKST', 'TIMEZONE:HST', 'TIMEZONE:AST',
    'TIMEZONE:BRT', 'TIMEZONE:ART', 'TIMEZONE:CLT', 'TIMEZONE:COT', 'TIMEZONE:MEX',
    'TIMEZONE:CET', 'TIMEZONE:EET', 'TIMEZONE:IST_DUBLIN', 'TIMEZONE:MSK',
    'TIMEZONE:IST', 'TIMEZONE:CST_CHINA', 'TIMEZONE:JST', 'TIMEZONE:KST',
    'TIMEZONE:SGT', 'TIMEZONE:HKT', 'TIMEZONE:ICT', 'TIMEZONE:WIB', 'TIMEZONE:PHT',
    'TIMEZONE:GST', 'TIMEZONE:PKT',
    'TIMEZONE:AEST', 'TIMEZONE:ACST', 'TIMEZONE:AWST', 'TIMEZONE:NZST',
    'TIMEZONE:SAST', 'TIMEZONE:EAT', 'TIMEZONE:WAT', 'TIMEZONE:EGY',
  ];

  await knex('ref_data').whereIn('code', timezoneCodes).delete();
}

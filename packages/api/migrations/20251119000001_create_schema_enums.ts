import { Knex } from 'knex';

/**
 * Migration: Create enums for schema split
 * Creates all enum types needed for the new normalized schema
 */
export async function up(knex: Knex): Promise<void> {
  // Connection status enum
  await knex.raw(`
    CREATE TYPE connection_status AS ENUM (
      'healthy',
      'degraded',
      'failed',
      'untested'
    );
  `);

  // Frequency type enum for schedules
  await knex.raw(`
    CREATE TYPE frequency_type AS ENUM (
      'minutely',
      'hourly',
      'daily',
      'weekly',
      'monthly',
      'yearly'
    );
  `);

  // Exclusion type enum for schedule exclusions
  await knex.raw(`
    CREATE TYPE exclusion_type AS ENUM (
      'specific_date',
      'date_range',
      'holiday_calendar'
    );
  `);

  // Watcher status enum (consolidated from enabled + polling_enabled)
  await knex.raw(`
    CREATE TYPE watcher_status AS ENUM (
      'active',
      'paused',
      'error',
      'disabled'
    );
  `);

  // Check status enum for watcher last check
  await knex.raw(`
    CREATE TYPE check_status AS ENUM (
      'success',
      'failed',
      'in_progress',
      'never_run'
    );
  `);

  // Poll status enum for watcher logs
  await knex.raw(`
    CREATE TYPE poll_status AS ENUM (
      'success',
      'failed',
      'timeout',
      'cancelled',
      'skipped'
    );
  `);

  // Trigger type enum for watcher logs
  await knex.raw(`
    CREATE TYPE trigger_type AS ENUM (
      'scheduler',
      'manual',
      'api',
      'retry'
    );
  `);

  // Alert type enum for file tracking
  await knex.raw(`
    CREATE TYPE alert_type AS ENUM (
      'sla_at_risk',
      'sla_breached',
      'file_arrived'
    );
  `);

  // Source type enum (expanded from file_sources)
  await knex.raw(`
    CREATE TYPE source_type AS ENUM (
      'S3',
      'AZURE_BLOB',
      'GCS',
      'SFTP',
      'FTP',
      'FTPS',
      'SHAREPOINT',
      'REST_API',
      'DATABASE',
      'FILE_SHARE'
    );
  `);

  // Match rule enum
  await knex.raw(`
    CREATE TYPE match_rule AS ENUM (
      'partial',
      'exact',
      'regex'
    );
  `);

  // Direction enum
  await knex.raw(`
    CREATE TYPE direction_type AS ENUM (
      'inward',
      'outward',
      'bidirectional'
    );
  `);

  // Tracking status enum
  await knex.raw(`
    CREATE TYPE tracking_status AS ENUM (
      'pending',
      'arrived',
      'late',
      'missing'
    );
  `);
}

/**
 * Rollback migration
 */
export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TYPE IF EXISTS tracking_status CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS direction_type CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS match_rule CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS source_type CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS alert_type CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS trigger_type CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS poll_status CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS check_status CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS watcher_status CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS exclusion_type CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS frequency_type CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS connection_status CASCADE;');
}

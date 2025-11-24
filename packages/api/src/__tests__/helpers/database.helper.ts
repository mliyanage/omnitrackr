import { Knex } from 'knex';
import { db } from '../../config/database';

/**
 * Database Test Helpers
 * Utilities for managing test database
 */

export class DatabaseHelper {
  private db: Knex;

  constructor() {
    this.db = db;
  }

  /**
   * Clean all tables (in reverse order to respect foreign keys)
   */
  async cleanDatabase(): Promise<void> {
    // New schema tables
    await this.db('watcher_logs').del();
    await this.db('file_tracking').del();
    await this.db('watchers').del();
    await this.db('schedule_exclusions').del();
    await this.db('schedules').del();
    await this.db('source_connections').del();
    await this.db('ref_data').del();

    // Legacy tables
    await this.db('notification_data').del();
    await this.db('notification_config').del();
    await this.db('inward_files').del();
    await this.db('file_source_credentials').del();
    await this.db('file_sources').del();
  }

  /**
   * Seed file_sources table with test data
   */
  async seedFileSources(count: number = 3) {
    const fileSources = [];
    for (let i = 1; i <= count; i++) {
      fileSources.push({
        name: `Test File Source ${i}`,
        type: 'S3',
        status: i === 1 ? 'active' : 'pending',
        enabled: true,
        connection_config: {
          sourceType: 'S3',
          bucketName: `test-bucket-${i}`,
          bucketRegion: 'us-east-1',
          monitorPath: `/test/${i}/`,
          credentialId: `test-cred-${i}`,
        },
        file_name_pattern: `test_*.csv`,
        match_rule: 'partial',
        schedule: '09:00',
        timezone: 'UTC',
        sla_threshold: 120,
        direction: 'inward',
        department: i === 1 ? 'Finance' : i === 2 ? 'Sales' : 'Operations',
        success_rate: 100,
        files_processed: 0,
      });
    }

    return this.db('file_sources').insert(fileSources).returning('*');
  }

  /**
   * Seed inward_files table with test data
   */
  async seedInwardFiles(fileSourceId: number, count: number = 5) {
    const inwardFiles = [];
    for (let i = 1; i <= count; i++) {
      inwardFiles.push({
        file_source_id: fileSourceId,
        file_name: `test_file_${i}.csv`,
        file_path: `/test/path/test_file_${i}.csv`,
        file_size: 1024 * i,
        detected_at: new Date(Date.now() - i * 3600000), // i hours ago
        sla_status: i <= 3 ? 'on_time' : i === 4 ? 'at_risk' : 'breached',
        processing_status: i <= 4 ? 'completed' : 'detected',
      });
    }

    return this.db('inward_files').insert(inwardFiles).returning('*');
  }

  /**
   * Get database connection
   */
  getDb(): Knex {
    return this.db;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.destroy();
  }
}

// Singleton instance
export const dbHelper = new DatabaseHelper();

import { FileSourceRepository } from '../../repositories/fileSource.repository';
import { FileSource } from '../../types';
import knex, { Knex } from 'knex';

/**
 * FileSourceRepository Integration Tests
 * Tests repository methods with in-memory SQLite database
 */

describe('FileSourceRepository', () => {
  let db: Knex;
  let repository: FileSourceRepository;

  // Mock data
  const mockFileSource: Partial<FileSource> = {
    name: 'Test File Source',
    type: 'S3',
    status: 'active',
    enabled: true,
    connection_config: {
      sourceType: 'S3',
      bucketName: 'test-bucket',
      bucketRegion: 'us-east-1',
      monitorPath: '/test/',
      credentialId: 'test-cred-123',
    },
    file_name_pattern: 'test_*.csv',
    match_rule: 'partial',
    schedule: '09:00',
    timezone: 'UTC',
    sla_threshold: 120,
    direction: 'inward',
    department: 'Finance',
    success_rate: 100,
    files_processed: 0,
  };

  beforeAll(() => {
    // Create mock Knex instance (in-memory SQLite for testing)
    db = knex({
      client: 'better-sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });

    repository = new FileSourceRepository(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    // Create test table before each test
    await db.schema.dropTableIfExists('file_sources');
    await db.schema.createTable('file_sources', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type').notNullable();
      table.string('status').notNullable();
      table.boolean('enabled').notNullable();
      table.jsonb('connection_config').notNullable();
      table.string('file_name_pattern').notNullable();
      table.string('match_rule').notNullable();
      table.string('schedule').notNullable();
      table.string('timezone').notNullable();
      table.integer('sla_threshold').notNullable();
      table.string('direction').notNullable();
      table.string('department').notNullable();
      table.decimal('success_rate').defaultTo(0);
      table.integer('files_processed').defaultTo(0);
      table.integer('poll_frequency_minutes');
      table.timestamp('last_sync');
      table.string('last_sync_status');
      table.text('last_sync_error');
      table.integer('last_poll_duration_ms');
      table.integer('last_objects_scanned');
      table.integer('last_objects_detected');
      table.timestamps(true, true);
    });
  });

  describe('create', () => {
    it('should create a new file source', async () => {
      const result = await repository.create(mockFileSource);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test File Source');
      expect(result.type).toBe('S3');
      expect(result.department).toBe('Finance');
    });

    it('should auto-generate id and timestamps', async () => {
      const result = await repository.create(mockFileSource);

      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find file source by id', async () => {
      const created = await repository.create(mockFileSource) as FileSource;
      const found = await repository.findById(created.id) as FileSource;

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Test File Source');
    });

    it('should return undefined for non-existent id', async () => {
      const found = await repository.findById(999);
      expect(found).toBeUndefined();
    });
  });

  describe('findByDepartment', () => {
    it('should find file sources by department', async () => {
      await repository.create(mockFileSource);
      await repository.create({ ...mockFileSource, name: 'Source 2', department: 'Sales' });
      await repository.create({ ...mockFileSource, name: 'Source 3', department: 'Finance' });

      const results = await repository.findByDepartment('Finance');

      expect(results).toHaveLength(2);
      expect(results.every((r: FileSource) => r.department === 'Finance')).toBe(true);
    });
  });

  describe('update', () => {
    it('should update file source', async () => {
      const created = await repository.create(mockFileSource) as FileSource;

      const updated = await repository.update(created.id, {
        name: 'Updated Name',
        sla_threshold: 180,
      }) as FileSource;

      expect(updated.name).toBe('Updated Name');
      expect(updated.sla_threshold).toBe(180);
      expect(updated.id).toBe(created.id);
    });
  });

  describe('updateStatus', () => {
    it('should update status', async () => {
      const created = await repository.create(mockFileSource) as FileSource;

      await repository.updateStatus(created.id, 'failed');

      const found = await repository.findById(created.id) as FileSource;
      expect(found.status).toBe('failed');
    });
  });

  describe('updateSyncStatus', () => {
    it('should update sync status on success', async () => {
      const created = await repository.create(mockFileSource) as FileSource;

      await repository.updateSyncStatus(created.id, 'success');

      const found = await repository.findById(created.id) as FileSource;
      expect(found.last_sync_status).toBe('success');
      expect(found.last_sync_error).toBeNull();
    });

    it('should update sync status on failure', async () => {
      const created = await repository.create(mockFileSource) as FileSource;

      await repository.updateSyncStatus(created.id, 'failed', 'Connection timeout');

      const found = await repository.findById(created.id) as FileSource;
      expect(found.last_sync_status).toBe('failed');
      expect(found.last_sync_error).toBe('Connection timeout');
    });
  });

  describe('delete', () => {
    it('should delete file source', async () => {
      const created = await repository.create(mockFileSource) as FileSource;

      const deleted = await repository.delete(created.id);
      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent id', async () => {
      const deleted = await repository.delete(999);
      expect(deleted).toBe(false);
    });
  });

  describe('count', () => {
    it('should count all file sources', async () => {
      await repository.create(mockFileSource);
      await repository.create({ ...mockFileSource, name: 'Source 2' });

      const count = await repository.count();
      expect(count).toBe(2);
    });

    it('should count with filters', async () => {
      await repository.create(mockFileSource);
      await repository.create({ ...mockFileSource, name: 'Source 2', department: 'Sales' });

      const count = await repository.count({ department: 'Finance' });
      expect(count).toBe(1);
    });
  });

  describe('exists', () => {
    it('should return true if exists', async () => {
      await repository.create(mockFileSource);

      const exists = await repository.exists({ name: 'Test File Source' });
      expect(exists).toBe(true);
    });

    it('should return false if not exists', async () => {
      const exists = await repository.exists({ name: 'Non Existent' });
      expect(exists).toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable file source', async () => {
      const created = await repository.create(mockFileSource) as FileSource;

      const disabled = await repository.setEnabled(created.id, false);
      // SQLite returns 0 for false, 1 for true
      expect(disabled.enabled).toBeFalsy();

      const enabled = await repository.setEnabled(created.id, true);
      expect(enabled.enabled).toBeTruthy();
    });
  });
});

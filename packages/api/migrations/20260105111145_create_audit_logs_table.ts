import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    // Primary key
    table.increments('id').primary();

    // User who performed the action
    table
      .integer('user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who performed the action (null if system)');

    // Organization context
    table
      .integer('organization_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .comment('Organization context for the action');

    // Action details
    table
      .enum('action', ['create', 'update', 'delete', 'read'], {
        useNative: true,
        enumName: 'audit_action',
      })
      .notNullable()
      .comment('Type of action performed');

    table
      .string('resource_type', 100)
      .notNullable()
      .comment('Type of resource (e.g., watcher, user, department)');

    table
      .string('resource_id', 100)
      .notNullable()
      .comment('ID of the resource affected');

    // Change details
    table
      .jsonb('changes')
      .nullable()
      .comment('Changes made (for updates: { old, new })');

    table
      .jsonb('metadata')
      .nullable()
      .comment('Additional metadata (request details, etc.)');

    // Request context
    table.string('ip_address', 45).nullable().comment('IP address of the request');

    table.text('user_agent').nullable().comment('User agent of the request');

    table.string('request_id', 100).nullable().comment('Request ID for correlation');

    // Timestamp
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id', 'idx_audit_logs_user');
    table.index('organization_id', 'idx_audit_logs_organization');
    table.index('resource_type', 'idx_audit_logs_resource_type');
    table.index('resource_id', 'idx_audit_logs_resource_id');
    table.index('action', 'idx_audit_logs_action');
    table.index('created_at', 'idx_audit_logs_created_at');
    table.index(['resource_type', 'resource_id'], 'idx_audit_logs_resource');
  });

  // Add comment to table
  await knex.raw(`
    COMMENT ON TABLE audit_logs IS 'Comprehensive audit log of all system actions';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.raw('DROP TYPE IF EXISTS audit_action');
}

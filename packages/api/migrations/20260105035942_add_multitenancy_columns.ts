import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add organization_id to watchers
  await knex.schema.alterTable('watchers', (table) => {
    table
      .integer('organization_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .comment('Organization that owns this watcher');

    table.index('organization_id', 'idx_watchers_organization');
  });

  // Add department_id to watchers (in addition to existing department_code)
  // department_id will be the new way to reference departments (FK constraint)
  // department_code will remain for backward compatibility
  await knex.schema.alterTable('watchers', (table) => {
    table
      .integer('department_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('departments')
      .onDelete('SET NULL')
      .comment('Department this watcher belongs to (new FK-based reference)');

    table.index('department_id', 'idx_watchers_department_id');
  });

  // Add organization_id to source_connections
  await knex.schema.alterTable('source_connections', (table) => {
    table
      .integer('organization_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .comment('Organization that owns this connection');

    table.index('organization_id', 'idx_source_connections_organization');
  });

  // Add organization_id to schedules
  await knex.schema.alterTable('schedules', (table) => {
    table
      .integer('organization_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .comment('Organization that owns this schedule');

    table.index('organization_id', 'idx_schedules_organization');
  });

  // Add organization_id to file_tracking
  await knex.schema.alterTable('file_tracking', (table) => {
    table
      .integer('organization_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .comment('Organization that owns this tracking record');

    table.index('organization_id', 'idx_file_tracking_organization');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove organization_id and department_id from watchers
  await knex.schema.alterTable('watchers', (table) => {
    table.dropIndex('organization_id', 'idx_watchers_organization');
    table.dropColumn('organization_id');
    table.dropIndex('department_id', 'idx_watchers_department_id');
    table.dropColumn('department_id');
  });

  // Remove organization_id from source_connections
  await knex.schema.alterTable('source_connections', (table) => {
    table.dropIndex('organization_id', 'idx_source_connections_organization');
    table.dropColumn('organization_id');
  });

  // Remove organization_id from schedules
  await knex.schema.alterTable('schedules', (table) => {
    table.dropIndex('organization_id', 'idx_schedules_organization');
    table.dropColumn('organization_id');
  });

  // Remove organization_id from file_tracking
  await knex.schema.alterTable('file_tracking', (table) => {
    table.dropIndex('organization_id', 'idx_file_tracking_organization');
    table.dropColumn('organization_id');
  });
}


import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('departments', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign key to organizations
    table
      .integer('organization_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .comment('Organization this department belongs to');

    // Department details
    table.string('name', 100).notNullable().comment('Department name');
    table
      .string('code', 50)
      .notNullable()
      .comment('Department code (unique within organization)');
    table.text('description').nullable().comment('Department description');

    // Status
    table
      .enum('status', ['active', 'inactive'], {
        useNative: true,
        enumName: 'department_status',
      })
      .notNullable()
      .defaultTo('active')
      .comment('Department status');

    // Settings (JSON)
    table
      .jsonb('settings')
      .nullable()
      .comment('Department-specific settings');

    // Audit fields
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').nullable();
    table.string('created_by', 100).notNullable().defaultTo('system');
    table.string('updated_by', 100).nullable();

    // Soft delete
    table.timestamp('deleted_at').nullable().comment('Soft delete timestamp');

    // Indexes
    table.index('organization_id', 'idx_departments_organization');
    table.index('status', 'idx_departments_status');
    table.index('deleted_at', 'idx_departments_deleted');

    // Unique constraint: code must be unique within an organization
    table.unique(['organization_id', 'code'], {
      indexName: 'uq_departments_org_code',
    });
  });

  // Add comment to table
  await knex.raw(`
    COMMENT ON TABLE departments IS 'Departments within organizations for resource segmentation';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('departments');
  await knex.raw('DROP TYPE IF EXISTS department_status');
}


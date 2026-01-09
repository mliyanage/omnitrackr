import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_departments', (table) => {
    // Primary key
    table.increments('id').primary();

    // Foreign keys
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .comment('User assigned to department');

    table
      .integer('department_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('departments')
      .onDelete('CASCADE')
      .comment('Department the user is assigned to');

    // Audit fields
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .integer('created_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who created this assignment');

    // Indexes
    table.index('user_id', 'idx_user_departments_user');
    table.index('department_id', 'idx_user_departments_department');

    // Unique constraint: user can only be assigned to a department once
    table.unique(['user_id', 'department_id'], {
      indexName: 'uq_user_departments',
    });
  });

  // Add comment to table
  await knex.raw(`
    COMMENT ON TABLE user_departments IS 'Assignment of users to departments for access control';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_departments');
}


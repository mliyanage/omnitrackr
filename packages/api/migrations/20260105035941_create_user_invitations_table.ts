import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_invitations', (table) => {
    // Primary key
    table.increments('id').primary();

    // Invitation details
    table
      .string('email', 255)
      .notNullable()
      .comment('Email address of invited user');

    table
      .integer('organization_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .comment('Organization the user is invited to');

    // Use existing user_role enum (created in users table migration)
    table
      .specificType('role', 'user_role')
      .notNullable()
      .comment('Role assigned to invited user');

    table
      .jsonb('department_ids')
      .nullable()
      .comment('Array of department IDs for editor/viewer roles');

    // Token management
    table
      .string('token_hash', 255)
      .notNullable()
      .unique()
      .comment('Hashed invitation token');

    table
      .timestamp('expires_at')
      .notNullable()
      .comment('Invitation expiration time');

    table
      .enum('status', ['pending', 'accepted', 'expired'], {
        useNative: true,
        enumName: 'invitation_status',
      })
      .notNullable()
      .defaultTo('pending')
      .comment('Invitation status');

    // Who invited and when accepted
    table
      .integer('invited_by')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .comment('User who sent the invitation');

    table.timestamp('accepted_at').nullable().comment('When invitation was accepted');

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').nullable();

    // Indexes
    table.index('email', 'idx_user_invitations_email');
    table.index('organization_id', 'idx_user_invitations_org');
    table.index('status', 'idx_user_invitations_status');
    table.index('token_hash', 'idx_user_invitations_token');
    table.index('expires_at', 'idx_user_invitations_expires');
  });

  // Add comment to table
  await knex.raw(`
    COMMENT ON TABLE user_invitations IS 'Pending and accepted user invitations';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_invitations');
  // Drop invitation_status enum (user_role is shared and managed by users table migration)
  await knex.raw('DROP TYPE IF EXISTS invitation_status');
}


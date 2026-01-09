import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('security_events', (table) => {
    // Primary key
    table.increments('id').primary();

    // User involved (may be null for failed login attempts)
    table
      .integer('user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User involved in the security event');

    // Organization context
    table
      .integer('organization_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE')
      .comment('Organization context');

    // Event type
    table
      .enum(
        'event_type',
        [
          'login_success',
          'login_failed',
          'login_locked',
          'logout',
          'password_changed',
          'password_reset_requested',
          'password_reset_completed',
          '2fa_enabled',
          '2fa_disabled',
          '2fa_failed',
          'email_verified',
          'account_created',
          'account_suspended',
          'account_deactivated',
          'permission_denied',
          'suspicious_activity',
        ],
        {
          useNative: true,
          enumName: 'security_event_type',
        }
      )
      .notNullable()
      .comment('Type of security event');

    // Severity level
    table
      .enum('severity', ['info', 'warning', 'critical'], {
        useNative: true,
        enumName: 'security_event_severity',
      })
      .notNullable()
      .defaultTo('info')
      .comment('Severity level of the event');

    // Event details
    table.text('description').notNullable().comment('Human-readable description');

    table
      .jsonb('metadata')
      .nullable()
      .comment('Additional event metadata');

    // Request context
    table.string('ip_address', 45).nullable().comment('IP address');

    table.text('user_agent').nullable().comment('User agent');

    table
      .string('device_fingerprint', 255)
      .nullable()
      .comment('Device fingerprint for tracking');

    // Timestamp
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id', 'idx_security_events_user');
    table.index('organization_id', 'idx_security_events_organization');
    table.index('event_type', 'idx_security_events_type');
    table.index('severity', 'idx_security_events_severity');
    table.index('created_at', 'idx_security_events_created_at');
    table.index('ip_address', 'idx_security_events_ip');
  });

  // Add comment to table
  await knex.raw(`
    COMMENT ON TABLE security_events IS 'Security-related events for monitoring and alerting';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('security_events');
  await knex.raw('DROP TYPE IF EXISTS security_event_type');
  await knex.raw('DROP TYPE IF EXISTS security_event_severity');
}

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_invitations', (table) => {
    table
      .string('first_name', 100)
      .nullable()
      .comment('First name of invited user');

    table
      .string('last_name', 100)
      .nullable()
      .comment('Last name of invited user');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_invitations', (table) => {
    table.dropColumn('first_name');
    table.dropColumn('last_name');
  });
}

import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Drop the foreign key constraint from users table
  await knex.schema.alterTable('users', (table) => {
    table.dropForeign(['role_id'])
  })

  // Change roles.id from uuid to string
  await knex.schema.alterTable('roles', (table) => {
    table.dropPrimary()
    table.dropColumn('id')
  })

  await knex.schema.alterTable('roles', (table) => {
    table.string('id', 32).primary()
  })

  // Change users.role_id from uuid to string to match
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('role_id')
  })

  await knex.schema.alterTable('users', (table) => {
    table.string('role_id', 32).notNullable()
  })

  // Re-add the foreign key constraint
  await knex.schema.alterTable('users', (table) => {
    table
      .foreign('role_id')
      .references('id')
      .inTable('roles')
      .onDelete('RESTRICT')
  })
}

export async function down(knex: Knex): Promise<void> {
  // Drop the foreign key constraint
  await knex.schema.alterTable('users', (table) => {
    table.dropForeign(['role_id'])
  })

  // Change users.role_id back to uuid
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('role_id')
  })

  await knex.schema.alterTable('users', (table) => {
    table.uuid('role_id').notNullable()
  })

  // Change roles.id back to uuid
  await knex.schema.alterTable('roles', (table) => {
    table.dropPrimary()
    table.dropColumn('id')
  })

  await knex.schema.alterTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
  })

  // Re-add the foreign key constraint
  await knex.schema.alterTable('users', (table) => {
    table
      .foreign('role_id')
      .references('id')
      .inTable('roles')
      .onDelete('RESTRICT')
  })
}

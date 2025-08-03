import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
  
  await knex.schema.createTable('roles', (table) => {
    table.string('id', 16).primary()
    table.string('name', 64).notNullable().unique()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('roles')
}

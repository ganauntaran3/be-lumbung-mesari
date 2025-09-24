import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_uuidv7;')

  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table.string('name', 64).notNullable().unique()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('roles')
}

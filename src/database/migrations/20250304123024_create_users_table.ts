import { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.string('id').primary().defaultTo(uuidv4())
    table.string('username').unique().notNullable()
    table.string('email').unique().notNullable()
    table.string('password').notNullable()
    table.string('full_name').notNullable()
    table.enum('role', ['admin', 'member']).notNullable().defaultTo('member')
    table
      .enum('status', ['pending', 'approved', 'rejected'])
      .notNullable()
      .defaultTo('pending')
    table.string('id_card_image').nullable()
    table.string('selfie_image').nullable()
    table.boolean('is_two_factor_enabled').defaultTo(false)
    table.string('two_factor_secret').nullable()
    table.timestamp('last_login').nullable()
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}

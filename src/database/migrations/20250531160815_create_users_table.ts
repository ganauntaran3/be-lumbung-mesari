import { Knex } from 'knex'

const userStatus = [
  'pending',
  'waiting_deposit',
  'active',
  'inactive',
  'rejected'
]

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table.string('email').notNullable().unique()
    table.string('fullname').notNullable()
    table.string('username').notNullable().unique()
    table.string('password').notNullable()
    table.string('phone_number').notNullable()
    table.text('address').notNullable()
    table.enum('status', userStatus).notNullable().defaultTo(userStatus[0])
    table
      .string('role_id', 36)
      .references('id')
      .inTable('roles')
      .onDelete('RESTRICT')
      .notNullable()
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}

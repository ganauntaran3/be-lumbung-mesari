import { Knex } from 'knex'

const userStatus = ['waiting_deposit', 'active', 'suspended', 'pending']

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table
      .string('id', 36)
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()::varchar'))
    table.string('email').notNullable().unique()
    table.string('fullname').notNullable()
    table.string('username').notNullable().unique()
    table.string('password').notNullable()
    table.string('phone_number').notNullable()
    table.text('address').notNullable()
    table.enum('status', userStatus).notNullable().defaultTo(userStatus[0])
    table
      .string('role_id')
      .references('id')
      .inTable('roles')
      .onDelete('RESTRICT')
      .notNullable()
    table.string('deposit_image_url').nullable()
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}

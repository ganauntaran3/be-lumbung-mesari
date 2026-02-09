import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('principal_savings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'))
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT')
      .notNullable()
    table.decimal('amount', 12, 4).notNullable()
    table
      .enum('status', ['paid', 'pending', 'cancelled'])
      .notNullable()
      .defaultTo('pending')
    table
      .uuid('processed_by')
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT')
      .nullable()
    table.timestamp('paid_at').nullable()
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('principal_savings')
}

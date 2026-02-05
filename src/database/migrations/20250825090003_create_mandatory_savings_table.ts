import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mandatory_savings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'))
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT')
      .notNullable()

    table.date('period_date').notNullable()
    table.decimal('amount', 12, 4).notNullable()

    table
      .enum('status', ['due', 'paid', 'overdue'])
      .notNullable()
      .defaultTo('due')

    table.timestamp('paid_at').nullable()
    // table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    // table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
    table.timestamps(true, true)
    table
      .uuid('processed_by')
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT')
      .nullable()
    table.unique(['user_id', 'period_date'])
  })
  await knex.raw(
    'CREATE INDEX mandatory_savings_period_idx ON mandatory_savings (period_date, status)'
  )
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS mandatory_savings_period_idx')
  await knex.schema.dropTableIfExists('mandatory_savings')
}

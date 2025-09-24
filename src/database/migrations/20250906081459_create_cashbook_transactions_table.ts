import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cashbook_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table.date('txn_date').notNullable().defaultTo(knex.fn.now())
    table.enum('direction', ['in', 'out']).notNullable()
    table.decimal('amount', 12, 4).notNullable()

    table
      .uuid('income_id')
      .references('id')
      .inTable('incomes')
      .onDelete('SET NULL')
    table
      .uuid('expense_id')
      .references('id')
      .inTable('expenses')
      .onDelete('SET NULL')
    table
      .uuid('principal_saving_id')
      .references('id')
      .inTable('principal_savings')
      .onDelete('SET NULL')
    table
      .uuid('mandatory_saving_id')
      .references('id')
      .inTable('mandatory_savings')
      .onDelete('SET NULL')

    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL')
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('cashbook_transactions')
}

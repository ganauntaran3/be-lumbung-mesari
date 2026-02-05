import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cashbook_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'))
    table.date('txn_date').notNullable().defaultTo(knex.fn.now())
    table.enum('direction', ['in', 'out']).notNullable()
    table.decimal('shu_amount', 12, 4).notNullable().defaultTo(0)
    table.decimal('capital_amount', 12, 4).notNullable().defaultTo(0)

    // Balance snapshots for audit trail
    table.decimal('shu_balance_before', 12, 4).notNullable()
    table.decimal('shu_balance_after', 12, 4).notNullable()
    table.decimal('capital_balance_before', 12, 4).notNullable()
    table.decimal('capital_balance_after', 12, 4).notNullable()
    table.decimal('total_balance_before', 12, 4).notNullable()
    table.decimal('total_balance_after', 12, 4).notNullable()

    table
      .uuid('income_id')
      .references('id')
      .inTable('incomes')
      .onDelete('CASCADE')
    table
      .uuid('expense_id')
      .references('id')
      .inTable('expenses')
      .onDelete('CASCADE')
    table.timestamps(true, true)

    table.check(
      'shu_amount + capital_amount > 0',
      [],
      'chk_cashbook_amounts_positive'
    )
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('cashbook_transactions')
}

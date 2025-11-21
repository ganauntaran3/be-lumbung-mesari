import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const defaultSource = ['auto', 'total', 'capital', 'shu']

  await knex.schema.createTable('expense_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table.string('code', 64).notNullable().unique() // misal: 'operational'
    table.string('name', 128).notNullable() // misal: 'Biaya Operasional'
    table.text('description').nullable()
    table.enum('default_source', defaultSource).notNullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('expenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table
      .uuid('expense_category_id')
      .references('id')
      .inTable('expense_categories')
      .onDelete('RESTRICT')
      .notNullable()
    table.string('name', 255).notNullable()
    table.decimal('shu_amount', 12, 4).notNullable().defaultTo(0)
    table.decimal('capital_amount', 12, 4).notNullable().defaultTo(0)
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL')
    table.uuid('loan_id').references('id').inTable('loans').onDelete('SET NULL')
    table.text('notes').nullable()
    table.enum('source', defaultSource).nullable()
    table.date('txn_date').notNullable().defaultTo(knex.fn.now())
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    table.check(
      'shu_amount + capital_amount > 0',
      [],
      'chk_expense_amounts_positive'
    )
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('expenses')
  await knex.schema.dropTable('expense_categories')
}

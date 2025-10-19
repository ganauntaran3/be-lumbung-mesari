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
    table.decimal('amount', 12, 4).notNullable()
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL')
    table.uuid('loan_id').references('id').inTable('loans').onDelete('SET NULL')
    table.text('notes').nullable()
    table.enum('source', defaultSource).nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('expenses')
  await knex.schema.dropTable('expense_categories')
}

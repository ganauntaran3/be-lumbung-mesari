import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('income_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table.string('code', 64).notNullable().unique() // misal: 'loan_interest'
    table.string('name', 128).notNullable() // misal: 'Bunga Pinjaman'
    table.text('description').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('incomes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table
      .uuid('category_id')
      .references('id')
      .inTable('income_categories')
      .onDelete('RESTRICT')
      .notNullable()
    table.decimal('amount', 12, 4).notNullable()
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL')
    table.uuid('loan_id').references('id').inTable('loans').onDelete('SET NULL')
    table.text('notes').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('incomes')
  await knex.schema.dropTable('income_categories')
}

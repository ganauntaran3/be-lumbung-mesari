import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('loan_periods', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table.integer('tenor').notNullable()
    table.decimal('interest_rate', 10, 4).notNullable()
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('loans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT')
      .notNullable()
    table
      .uuid('loan_period_id')
      .references('id')
      .inTable('loan_periods')
      .onDelete('RESTRICT')
      .notNullable()
    table.decimal('principal_amount', 12, 4).notNullable()
    table.decimal('admin_fee_amount', 12, 4).notNullable()
    table.decimal('disbursed_amount', 12, 4).notNullable()
    table.decimal('interest_amount', 12, 4).notNullable()
    table.decimal('monthly_payment', 12, 4).notNullable()
    table.decimal('total_payable_amount', 12, 4).notNullable()
    table.date('start_date').notNullable()
    table.date('end_date').notNullable()
    table
      .enum('status', [
        'pending',
        'approved',
        'rejected',
        'active',
        'completed'
      ])
      .notNullable()
    table
      .uuid('approved_by')
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT')
      .notNullable()
    table.timestamp('approved_at').notNullable()
    table.text('notes').nullable()
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('loans')
  await knex.schema.dropTableIfExists('loan_periods')
}

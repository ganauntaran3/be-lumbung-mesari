import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('installments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table
      .uuid('loan_id')
      .references('id')
      .inTable('loans')
      .onDelete('CASCADE')
      .notNullable()
    table.integer('installment_number').notNullable()
    table.date('due_date').notNullable()
    table.decimal('principal_amount', 12, 4).notNullable()
    table.decimal('interest_amount', 12, 4).notNullable()
    table.decimal('penalty_amount', 12, 4).notNullable().defaultTo(0)
    table.decimal('total_amount', 12, 4).notNullable()
    table.date('paid_date').nullable()
    table.decimal('paid_amount', 12, 4).nullable()
    table
      .enum('status', ['due', 'paid', 'overdue', 'partial'])
      .notNullable()
      .defaultTo('due')

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())

    table.unique(['loan_id', 'installment_number'])
  })

  await knex.raw(
    'CREATE INDEX installments_loan_due_idx ON installments (loan_id, due_date, status)'
  )
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS installments_loan_due_idx')
  await knex.schema.dropTableIfExists('installments')
}

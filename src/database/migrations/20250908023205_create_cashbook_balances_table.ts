import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cashbook_balances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'))
    table.string('type', 16).notNullable().unique() // // Type identifier: 'total', 'capital', or 'shu'
    table.decimal('balance', 12, 4).notNullable().defaultTo(0)
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
  })

  // Create index for fast lookups
  await knex.raw(
    'CREATE INDEX idx_cashbook_balances_type ON cashbook_balances(type)'
  )

  // Insert saldo awal
  await knex('cashbook_balances').insert([
    { type: 'total', balance: 5000000 },
    { type: 'capital', balance: 5000000 },
    { type: 'shu', balance: 0 }
  ])
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_cashbook_balances_type')
  await knex.schema.dropTableIfExists('cashbook_balances')
}

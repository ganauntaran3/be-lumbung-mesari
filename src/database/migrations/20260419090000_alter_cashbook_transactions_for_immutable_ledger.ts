import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cashbook_transactions', (table) => {
    table.boolean('is_reversal').notNullable().defaultTo(false)
    table.uuid('reversal_of').nullable()
    table.timestamp('deleted_at').nullable()
  })

  await knex.raw(`
    ALTER TABLE cashbook_transactions
    DROP CONSTRAINT IF EXISTS cashbook_transactions_income_id_foreign;
  `)

  await knex.raw(`
    ALTER TABLE cashbook_transactions
    ADD CONSTRAINT cashbook_transactions_income_id_foreign
    FOREIGN KEY (income_id)
    REFERENCES incomes(id)
    ON DELETE SET NULL;
  `)

  await knex.raw(`
    ALTER TABLE cashbook_transactions
    DROP CONSTRAINT IF EXISTS cashbook_transactions_expense_id_foreign;
  `)

  await knex.raw(`
    ALTER TABLE cashbook_transactions
    ADD CONSTRAINT cashbook_transactions_expense_id_foreign
    FOREIGN KEY (expense_id)
    REFERENCES expenses(id)
    ON DELETE SET NULL;
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE cashbook_transactions
    DROP CONSTRAINT IF EXISTS cashbook_transactions_income_id_foreign;
  `)

  await knex.raw(`
    ALTER TABLE cashbook_transactions
    ADD CONSTRAINT cashbook_transactions_income_id_foreign
    FOREIGN KEY (income_id)
    REFERENCES incomes(id)
    ON DELETE CASCADE;
  `)

  await knex.raw(`
    ALTER TABLE cashbook_transactions
    DROP CONSTRAINT IF EXISTS cashbook_transactions_expense_id_foreign;
  `)

  await knex.raw(`
    ALTER TABLE cashbook_transactions
    ADD CONSTRAINT cashbook_transactions_expense_id_foreign
    FOREIGN KEY (expense_id)
    REFERENCES expenses(id)
    ON DELETE CASCADE;
  `)

  await knex.schema.alterTable('cashbook_transactions', (table) => {
    table.dropColumn('is_reversal')
    table.dropColumn('reversal_of')
    table.dropColumn('deleted_at')
  })
}

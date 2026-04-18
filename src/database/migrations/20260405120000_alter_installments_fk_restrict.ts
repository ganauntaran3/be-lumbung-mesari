import type { Knex } from 'knex'

/**
 * Change installments.loan_id FK from CASCADE to RESTRICT.
 * Prevents accidental deletion of loans that have installment history.
 * Application layer (loans controller) enforces status-based delete rules;
 * this is the DB-level safety net.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE installments
    DROP CONSTRAINT IF EXISTS installments_loan_id_foreign;
  `)

  await knex.raw(`
    ALTER TABLE installments
    ADD CONSTRAINT installments_loan_id_foreign
    FOREIGN KEY (loan_id)
    REFERENCES loans(id)
    ON DELETE RESTRICT;
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE installments
    DROP CONSTRAINT IF EXISTS installments_loan_id_foreign;
  `)

  await knex.raw(`
    ALTER TABLE installments
    ADD CONSTRAINT installments_loan_id_foreign
    FOREIGN KEY (loan_id)
    REFERENCES loans(id)
    ON DELETE CASCADE;
  `)
}

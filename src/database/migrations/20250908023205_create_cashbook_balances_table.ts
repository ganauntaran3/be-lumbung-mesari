import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cashbook_balances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
    table.decimal('balance', 12, 4).notNullable().defaultTo(0)
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
  })

  // Update saldo setelah transaksi baru
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_cashbook_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      IF EXISTS (SELECT 1 FROM cashbook_balances) THEN
        IF NEW.direction = 'in' THEN
          UPDATE cashbook_balances
          SET balance = balance + NEW.amount, updated_at = NOW();
        ELSE
          UPDATE cashbook_balances
          SET balance = balance - NEW.amount, updated_at = NOW();
        END IF;
      ELSE
        -- kalau belum ada record saldo (init pertama kali)
        IF NEW.direction = 'in' THEN
          INSERT INTO cashbook_balances (id, balance, updated_at)
          VALUES (uuid_generate_v7(), NEW.amount, NOW());
        ELSE
          INSERT INTO cashbook_balances (id, balance, updated_at)
          VALUES (uuid_generate_v7(), -NEW.amount, NOW());
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  // Trigger pada cashbook_transactions
  await knex.raw(`
    CREATE TRIGGER trg_update_cashbook_balance
    AFTER INSERT ON cashbook_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_cashbook_balance();
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    `DROP TRIGGER IF EXISTS trg_update_cashbook_balance ON cashbook_transactions`
  )
  await knex.raw(`DROP FUNCTION IF EXISTS update_cashbook_balance`)
  await knex.schema.dropTableIfExists('cashbook_balances')
}

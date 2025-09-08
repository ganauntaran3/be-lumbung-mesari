import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Constraint: max 3 loans aktif per anggota
  await knex.raw(`
    CREATE UNIQUE INDEX uniq_user_loans_active
    ON loans(user_id)
    WHERE status IN ('pending','approved','active');
  `)

  //   Function + Trigger: auto update updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  // daftar tabel yang perlu trigger
  const tables = [
    'users',
    'loans',
    'loan_periods',
    'installments',
    'mandatory_savings',
    'principal_savings',
    'incomes',
    'expenses',
    'cashbook_transactions'
  ]

  for (const t of tables) {
    await knex.raw(`
      CREATE TRIGGER trg_update_${t}
      BEFORE UPDATE ON ${t}
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `)
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS uniq_user_loans_active')

  const tables = [
    'users',
    'loans',
    'loan_periods',
    'installments',
    'mandatory_savings',
    'principal_savings',
    'incomes',
    'expenses',
    'cashbook_transactions'
  ]

  for (const t of tables) {
    await knex.raw(`DROP TRIGGER IF EXISTS trg_update_${t} ON ${t}`)
  }

  await knex.raw('DROP FUNCTION IF EXISTS set_updated_at')
}

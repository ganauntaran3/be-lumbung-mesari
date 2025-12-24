import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Constraint: max 3 loans per member (pending, approved, or active)
  await knex.raw(`
    CREATE OR REPLACE FUNCTION check_max_loans_per_user()
    RETURNS TRIGGER AS $$
    DECLARE
      loan_count INTEGER;
    BEGIN
      -- Count existing loans for this user in pending/approved/active status
      SELECT COUNT(*)
      INTO loan_count
      FROM loans
      WHERE user_id = NEW.user_id
        AND status IN ('pending', 'approved', 'active')
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');
      
      -- Check if adding this loan would exceed the limit
      IF loan_count >= 3 THEN
        RAISE EXCEPTION 'User cannot have more than 3 loans in pending/approved/active status';
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  await knex.raw(`
    CREATE TRIGGER trg_check_max_loans
    BEFORE INSERT OR UPDATE ON loans
    FOR EACH ROW
    WHEN (NEW.status IN ('pending', 'approved', 'active'))
    EXECUTE FUNCTION check_max_loans_per_user();
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
  await knex.raw('DROP TRIGGER IF EXISTS trg_check_max_loans ON loans')
  await knex.raw('DROP FUNCTION IF EXISTS check_max_loans_per_user')

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

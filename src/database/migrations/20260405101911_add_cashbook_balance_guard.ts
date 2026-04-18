import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Step 1: Add CHECK constraint to cashbook_balances
  await knex.raw(`
    ALTER TABLE cashbook_balances
    ADD CONSTRAINT chk_cashbook_balance_non_negative
    CHECK (balance >= 0);
  `)

  // Step 2: Replace cashbook_insert_balance with a version that guards
  //         against going negative on expense transactions
  await knex.raw(`
    CREATE OR REPLACE FUNCTION cashbook_insert_balance()
    RETURNS TRIGGER AS $$
    DECLARE
      current_shu DECIMAL;
      current_capital DECIMAL;
    BEGIN
      -- Handle INCOME transactions (direction = 'in')
      IF NEW.direction = 'in' THEN
        IF NEW.shu_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances
          SET balance = balance + NEW.shu_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'shu';
        END IF;

        IF NEW.capital_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances
          SET balance = balance + NEW.capital_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'capital';
        END IF;

        UPDATE cashbook_balances
        SET balance = balance + (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL), updated_at = NOW()
        WHERE type = 'total';

        RAISE NOTICE 'Income Added: SHU+%, Capital+%, Total+%', NEW.shu_amount::DECIMAL, NEW.capital_amount::DECIMAL, (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL);
      END IF;

      -- Handle EXPENSE transactions (direction = 'out')
      IF NEW.direction = 'out' THEN
        -- Guard: verify balances will not go negative
        IF NEW.shu_amount::DECIMAL > 0 THEN
          SELECT balance INTO current_shu FROM cashbook_balances WHERE type = 'shu';
          IF current_shu < NEW.shu_amount::DECIMAL THEN
            RAISE EXCEPTION 'Insufficient SHU balance: available %, required %', current_shu, NEW.shu_amount::DECIMAL;
          END IF;
        END IF;

        IF NEW.capital_amount::DECIMAL > 0 THEN
          SELECT balance INTO current_capital FROM cashbook_balances WHERE type = 'capital';
          IF current_capital < NEW.capital_amount::DECIMAL THEN
            RAISE EXCEPTION 'Insufficient capital balance: available %, required %', current_capital, NEW.capital_amount::DECIMAL;
          END IF;
        END IF;

        IF NEW.shu_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances
          SET balance = balance - NEW.shu_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'shu';
        END IF;

        IF NEW.capital_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances
          SET balance = balance - NEW.capital_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'capital';
        END IF;

        UPDATE cashbook_balances
        SET balance = balance - (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL), updated_at = NOW()
        WHERE type = 'total';

        RAISE NOTICE 'Expense Added: SHU-%, Capital-%, Total-%', NEW.shu_amount::DECIMAL, NEW.capital_amount::DECIMAL, (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL);
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)
}

export async function down(knex: Knex): Promise<void> {
  // Remove CHECK constraint
  await knex.raw(`
    ALTER TABLE cashbook_balances
    DROP CONSTRAINT IF EXISTS chk_cashbook_balance_non_negative;
  `)

  // Restore original cashbook_insert_balance without guard
  await knex.raw(`
    CREATE OR REPLACE FUNCTION cashbook_insert_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.direction = 'in' THEN
        IF NEW.shu_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances
          SET balance = balance + NEW.shu_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'shu';
        END IF;

        IF NEW.capital_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances
          SET balance = balance + NEW.capital_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'capital';
        END IF;

        UPDATE cashbook_balances
        SET balance = balance + (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL), updated_at = NOW()
        WHERE type = 'total';

        RAISE NOTICE 'Income Added: SHU+%, Capital+%, Total+%', NEW.shu_amount::DECIMAL, NEW.capital_amount::DECIMAL, (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL);
      END IF;

      IF NEW.direction = 'out' THEN
        IF NEW.shu_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances
          SET balance = balance - NEW.shu_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'shu';
        END IF;

        IF NEW.capital_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances
          SET balance = balance - NEW.capital_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'capital';
        END IF;

        UPDATE cashbook_balances
        SET balance = balance - (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL), updated_at = NOW()
        WHERE type = 'total';

        RAISE NOTICE 'Expense Added: SHU-%, Capital-%, Total-%', NEW.shu_amount::DECIMAL, NEW.capital_amount::DECIMAL, (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL);
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)
}

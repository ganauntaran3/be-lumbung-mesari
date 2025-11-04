import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cashbook_balances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v7()'))
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

  // Enhanced trigger function with shu_amount and capital_amount fields
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_cashbook_balance()
    RETURNS TRIGGER AS $$
    DECLARE
      income_destination TEXT;
      amount_val DECIMAL;
      shu_amount_val DECIMAL;
      capital_amount_val DECIMAL;
      old_shu_amount_val DECIMAL;
      old_capital_amount_val DECIMAL;
      operation_type TEXT;
    BEGIN
      -- Determine operation type and extract amounts from related expense
      IF TG_OP = 'DELETE' THEN
        operation_type := 'DELETE';
        amount_val := OLD.amount::DECIMAL;
        -- Get expense amounts if this is an expense transaction
        IF OLD.expense_id IS NOT NULL THEN
          SELECT COALESCE(e.shu_amount, 0), COALESCE(e.capital_amount, 0)
          INTO shu_amount_val, capital_amount_val
          FROM expenses e WHERE e.id = OLD.expense_id;
        ELSE
          shu_amount_val := 0;
          capital_amount_val := 0;
        END IF;
      ELSIF TG_OP = 'UPDATE' THEN
        operation_type := 'UPDATE';
        amount_val := NEW.amount::DECIMAL;
        -- Get new expense amounts
        IF NEW.expense_id IS NOT NULL THEN
          SELECT COALESCE(e.shu_amount, 0), COALESCE(e.capital_amount, 0)
          INTO shu_amount_val, capital_amount_val
          FROM expenses e WHERE e.id = NEW.expense_id;
        ELSE
          shu_amount_val := 0;
          capital_amount_val := 0;
        END IF;
        -- Get old expense amounts
        IF OLD.expense_id IS NOT NULL THEN
          SELECT COALESCE(e.shu_amount, 0), COALESCE(e.capital_amount, 0)
          INTO old_shu_amount_val, old_capital_amount_val
          FROM expenses e WHERE e.id = OLD.expense_id;
        ELSE
          old_shu_amount_val := 0;
          old_capital_amount_val := 0;
        END IF;
      ELSE -- INSERT
        operation_type := 'INSERT';
        amount_val := NEW.amount::DECIMAL;
        -- Get expense amounts if this is an expense transaction
        IF NEW.expense_id IS NOT NULL THEN
          SELECT COALESCE(e.shu_amount, 0), COALESCE(e.capital_amount, 0)
          INTO shu_amount_val, capital_amount_val
          FROM expenses e WHERE e.id = NEW.expense_id;
        ELSE
          shu_amount_val := 0;
          capital_amount_val := 0;
        END IF;
      END IF;
      
      -- Handle DELETE operations (reverse the original transaction)
      IF TG_OP = 'DELETE' THEN
        -- Handle INCOME deletion (subtract from balances)
        IF OLD.income_id IS NOT NULL THEN
          SELECT ic.default_destination INTO income_destination
          FROM incomes i
          JOIN income_categories ic ON i.income_category_id = ic.id
          WHERE i.id = OLD.income_id;
          
          -- Reverse: subtract from total and specific balance
          UPDATE cashbook_balances 
          SET balance = balance - amount_val, updated_at = NOW()
          WHERE type IN ('total', income_destination);
          
          RAISE NOTICE 'Income Deleted: Subtracted % from % and total', amount_val, income_destination;
        END IF;
        
        -- Handle EXPENSE deletion (add back exact amounts)
        IF OLD.expense_id IS NOT NULL THEN
          -- Add back SHU amount if any
          IF shu_amount_val > 0 THEN
            UPDATE cashbook_balances 
            SET balance = balance + shu_amount_val, updated_at = NOW()
            WHERE type = 'shu';
            RAISE NOTICE 'Expense Deleted: Added back % to SHU', shu_amount_val;
          END IF;
          
          -- Add back Capital amount if any
          IF capital_amount_val > 0 THEN
            UPDATE cashbook_balances 
            SET balance = balance + capital_amount_val, updated_at = NOW()
            WHERE type = 'capital';
            RAISE NOTICE 'Expense Deleted: Added back % to capital', capital_amount_val;
          END IF;
          
          -- Add back total amount
          UPDATE cashbook_balances 
          SET balance = balance + (shu_amount_val + capital_amount_val), updated_at = NOW()
          WHERE type = 'total';
          RAISE NOTICE 'Expense Deleted: Added back % to total', (shu_amount_val + capital_amount_val);
        END IF;
        
        RETURN OLD;
      END IF;
      
      -- Handle UPDATE operations (reverse old, apply new)
      IF TG_OP = 'UPDATE' THEN
        -- Only process if amounts changed or IDs changed
        IF OLD.amount != NEW.amount OR OLD.income_id != NEW.income_id OR OLD.expense_id != NEW.expense_id OR
           old_shu_amount_val != shu_amount_val OR old_capital_amount_val != capital_amount_val THEN
          
          -- First reverse the old transaction
          IF OLD.income_id IS NOT NULL THEN
            SELECT ic.default_destination INTO income_destination
            FROM incomes i
            JOIN income_categories ic ON i.income_category_id = ic.id
            WHERE i.id = OLD.income_id;
            
            UPDATE cashbook_balances 
            SET balance = balance - OLD.amount::DECIMAL, updated_at = NOW()
            WHERE type IN ('total', income_destination);
          END IF;
          
          IF OLD.expense_id IS NOT NULL THEN
            -- Reverse old expense amounts
            IF old_shu_amount_val > 0 THEN
              UPDATE cashbook_balances 
              SET balance = balance + old_shu_amount_val, updated_at = NOW()
              WHERE type = 'shu';
            END IF;
            
            IF old_capital_amount_val > 0 THEN
              UPDATE cashbook_balances 
              SET balance = balance + old_capital_amount_val, updated_at = NOW()
              WHERE type = 'capital';
            END IF;
            
            UPDATE cashbook_balances 
            SET balance = balance + (old_shu_amount_val + old_capital_amount_val), updated_at = NOW()
            WHERE type = 'total';
          END IF;
          
          -- Now apply the new transaction (fall through to INSERT logic)
        ELSE
          -- No significant change, return early
          RETURN NEW;
        END IF;
      END IF;
      
      -- Handle INSERT operations (and UPDATE after reversing old values)
      -- Handle INCOME transactions
      IF NEW.income_id IS NOT NULL THEN
        SELECT ic.default_destination INTO income_destination
        FROM incomes i
        JOIN income_categories ic ON i.income_category_id = ic.id
        WHERE i.id = NEW.income_id;
        
        UPDATE cashbook_balances 
        SET balance = balance + amount_val, updated_at = NOW()
        WHERE type = 'total';
        
        UPDATE cashbook_balances 
        SET balance = balance + amount_val, updated_at = NOW()
        WHERE type = income_destination;
        
        RAISE NOTICE 'Income %: Added % to % and total', operation_type, amount_val, income_destination;
      END IF;
      
      -- Handle EXPENSE transactions (using exact amounts)
      IF NEW.expense_id IS NOT NULL THEN
        -- Deduct SHU amount if any
        IF shu_amount_val > 0 THEN
          UPDATE cashbook_balances 
          SET balance = balance - shu_amount_val, updated_at = NOW()
          WHERE type = 'shu';
          RAISE NOTICE 'Expense %: Deducted % from SHU', operation_type, shu_amount_val;
        END IF;
        
        -- Deduct Capital amount if any
        IF capital_amount_val > 0 THEN
          UPDATE cashbook_balances 
          SET balance = balance - capital_amount_val, updated_at = NOW()
          WHERE type = 'capital';
          RAISE NOTICE 'Expense %: Deducted % from capital', operation_type, capital_amount_val;
        END IF;
        
        -- Deduct total amount
        UPDATE cashbook_balances 
        SET balance = balance - (shu_amount_val + capital_amount_val), updated_at = NOW()
        WHERE type = 'total';
        RAISE NOTICE 'Expense %: Deducted % from total', operation_type, (shu_amount_val + capital_amount_val);
      END IF;
      
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `)

  // Trigger pada cashbook_transactions - handle INSERT, UPDATE, DELETE
  await knex.raw(`
    CREATE TRIGGER trg_update_cashbook_balance
    AFTER INSERT OR UPDATE OR DELETE ON cashbook_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_cashbook_balance();
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_cashbook_balance ON cashbook_transactions'
  )
  await knex.raw('DROP FUNCTION IF EXISTS update_cashbook_balance')
  await knex.raw('DROP INDEX IF EXISTS idx_cashbook_balances_type')
  await knex.schema.dropTableIfExists('cashbook_balances')
}

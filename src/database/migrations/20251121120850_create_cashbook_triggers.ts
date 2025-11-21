import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Purpose: Automatically sync cashbook_transactions changes to cashbook_balances
  // Architecture: Application syncs incomes/expenses → cashbook_transactions
  //               Triggers sync cashbook_transactions → cashbook_balances

  // 1. Handle cashbook_transactions INSERT - Add to balances
  await knex.raw(`
    CREATE OR REPLACE FUNCTION cashbook_insert_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Handle INCOME transactions (direction = 'in')
      IF NEW.direction = 'in' THEN
        -- Add to specific balance (shu or capital)
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
        
        -- Add to total
        UPDATE cashbook_balances 
        SET balance = balance + (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL), updated_at = NOW()
        WHERE type = 'total';
        
        RAISE NOTICE 'Income Added: SHU+%, Capital+%, Total+%', NEW.shu_amount::DECIMAL, NEW.capital_amount::DECIMAL, (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL);
      END IF;
      
      -- Handle EXPENSE transactions (direction = 'out')
      IF NEW.direction = 'out' THEN
        -- Deduct from specific balances
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
        
        -- Deduct from total
        UPDATE cashbook_balances 
        SET balance = balance - (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL), updated_at = NOW()
        WHERE type = 'total';
        
        RAISE NOTICE 'Expense Added: SHU-%, Capital-%, Total-%', NEW.shu_amount::DECIMAL, NEW.capital_amount::DECIMAL, (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL);
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  await knex.raw(`
    CREATE TRIGGER trg_cashbook_insert_balance
    AFTER INSERT ON cashbook_transactions
    FOR EACH ROW
    EXECUTE FUNCTION cashbook_insert_balance();
  `)

  // 2. Handle cashbook_transactions UPDATE - Adjust balances
  await knex.raw(`
    CREATE OR REPLACE FUNCTION cashbook_update_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Only process if amounts or direction changed
      IF OLD.shu_amount != NEW.shu_amount OR OLD.capital_amount != NEW.capital_amount OR OLD.direction != NEW.direction THEN
        
        -- First reverse the old transaction
        IF OLD.direction = 'in' THEN
          -- Subtract old income amounts
          IF OLD.shu_amount::DECIMAL > 0 THEN
            UPDATE cashbook_balances 
            SET balance = balance - OLD.shu_amount::DECIMAL, updated_at = NOW()
            WHERE type = 'shu';
          END IF;
          
          IF OLD.capital_amount::DECIMAL > 0 THEN
            UPDATE cashbook_balances 
            SET balance = balance - OLD.capital_amount::DECIMAL, updated_at = NOW()
            WHERE type = 'capital';
          END IF;
          
          UPDATE cashbook_balances 
          SET balance = balance - (OLD.shu_amount::DECIMAL + OLD.capital_amount::DECIMAL), updated_at = NOW()
          WHERE type = 'total';
        END IF;
        
        IF OLD.direction = 'out' THEN
          -- Add back old expense amounts
          IF OLD.shu_amount::DECIMAL > 0 THEN
            UPDATE cashbook_balances 
            SET balance = balance + OLD.shu_amount::DECIMAL, updated_at = NOW()
            WHERE type = 'shu';
          END IF;
          
          IF OLD.capital_amount::DECIMAL > 0 THEN
            UPDATE cashbook_balances 
            SET balance = balance + OLD.capital_amount::DECIMAL, updated_at = NOW()
            WHERE type = 'capital';
          END IF;
          
          UPDATE cashbook_balances 
          SET balance = balance + (OLD.shu_amount::DECIMAL + OLD.capital_amount::DECIMAL), updated_at = NOW()
          WHERE type = 'total';
        END IF;
        
        -- Now apply the new transaction
        IF NEW.direction = 'in' THEN
          -- Add new income amounts
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
        END IF;
        
        IF NEW.direction = 'out' THEN
          -- Deduct new expense amounts
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
        END IF;
        
        RAISE NOTICE 'Cashbook Updated: Old total %, New total %', (OLD.shu_amount::DECIMAL + OLD.capital_amount::DECIMAL), (NEW.shu_amount::DECIMAL + NEW.capital_amount::DECIMAL);
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  await knex.raw(`
    CREATE TRIGGER trg_cashbook_update_balance
    AFTER UPDATE ON cashbook_transactions
    FOR EACH ROW
    EXECUTE FUNCTION cashbook_update_balance();
  `)

  // 3. Handle cashbook_transactions DELETE - Restore balances
  await knex.raw(`
    CREATE OR REPLACE FUNCTION cashbook_delete_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Handle INCOME deletion (subtract from balances)
      IF OLD.direction = 'in' THEN
        IF OLD.shu_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances 
          SET balance = balance - OLD.shu_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'shu';
        END IF;
        
        IF OLD.capital_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances 
          SET balance = balance - OLD.capital_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'capital';
        END IF;
        
        UPDATE cashbook_balances 
        SET balance = balance - (OLD.shu_amount::DECIMAL + OLD.capital_amount::DECIMAL), updated_at = NOW()
        WHERE type = 'total';
        
        RAISE NOTICE 'Income Deleted: Subtracted SHU-%, Capital-%, Total-%', OLD.shu_amount::DECIMAL, OLD.capital_amount::DECIMAL, (OLD.shu_amount::DECIMAL + OLD.capital_amount::DECIMAL);
      END IF;
      
      -- Handle EXPENSE deletion (add back to balances)
      IF OLD.direction = 'out' THEN
        IF OLD.shu_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances 
          SET balance = balance + OLD.shu_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'shu';
        END IF;
        
        IF OLD.capital_amount::DECIMAL > 0 THEN
          UPDATE cashbook_balances 
          SET balance = balance + OLD.capital_amount::DECIMAL, updated_at = NOW()
          WHERE type = 'capital';
        END IF;
        
        UPDATE cashbook_balances 
        SET balance = balance + (OLD.shu_amount::DECIMAL + OLD.capital_amount::DECIMAL), updated_at = NOW()
        WHERE type = 'total';
        
        RAISE NOTICE 'Expense Deleted: Added back SHU+%, Capital+%, Total+%', OLD.shu_amount::DECIMAL, OLD.capital_amount::DECIMAL, (OLD.shu_amount::DECIMAL + OLD.capital_amount::DECIMAL);
      END IF;
      
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `)

  await knex.raw(`
    CREATE TRIGGER trg_cashbook_delete_balance
    AFTER DELETE ON cashbook_transactions
    FOR EACH ROW
    EXECUTE FUNCTION cashbook_delete_balance();
  `)
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_cashbook_insert_balance ON cashbook_transactions'
  )
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_cashbook_update_balance ON cashbook_transactions'
  )
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_cashbook_delete_balance ON cashbook_transactions'
  )

  // Drop functions with CASCADE for safety
  await knex.raw('DROP FUNCTION IF EXISTS cashbook_insert_balance() CASCADE')
  await knex.raw('DROP FUNCTION IF EXISTS cashbook_update_balance() CASCADE')
  await knex.raw('DROP FUNCTION IF EXISTS cashbook_delete_balance() CASCADE')
}

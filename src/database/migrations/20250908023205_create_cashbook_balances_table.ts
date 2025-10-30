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
    { type: 'total', balance: 5000000.0 },
    { type: 'capital', balance: 5000000.0 },
    { type: 'shu', balance: 0 }
  ])

  // Enhanced trigger function with category-based logic
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_cashbook_balance()
    RETURNS TRIGGER AS $$
    DECLARE
      income_destination TEXT;
      expense_source TEXT;
      amount_val DECIMAL;
      current_shu_balance DECIMAL;
      current_capital_balance DECIMAL;
    BEGIN
      amount_val := NEW.amount::DECIMAL;
      
      -- Handle INCOME transactions
      IF NEW.income_id IS NOT NULL THEN
        -- Get destination from category (no override for income)
        SELECT ic.default_destination INTO income_destination
        FROM incomes i
        JOIN income_categories ic ON i.income_category_id = ic.id
        WHERE i.id = NEW.income_id;
        
        -- Update total balance
        UPDATE cashbook_balances 
        SET balance = balance + amount_val, updated_at = NOW()
        WHERE type = 'total';
        
        -- Update specific balance based on destination
        UPDATE cashbook_balances 
        SET balance = balance + amount_val, updated_at = NOW()
        WHERE type = income_destination;
        
        RAISE NOTICE 'Income: Added % to % and total', amount_val, income_destination;
      END IF;
      
      -- Handle EXPENSE transactions
      IF NEW.expense_id IS NOT NULL THEN
        -- Get source (override or category default)
        SELECT COALESCE(e.source, ec.default_source) INTO expense_source
        FROM expenses e
        JOIN expense_categories ec ON e.expense_category_id = ec.id
        WHERE e.id = NEW.expense_id;
        
        -- Get current balances for validation
        SELECT balance INTO current_shu_balance 
        FROM cashbook_balances WHERE type = 'shu';
        
        SELECT balance INTO current_capital_balance 
        FROM cashbook_balances WHERE type = 'capital';
        
        -- Handle different source types
        CASE expense_source
          WHEN 'shu' THEN
            -- SHU only - validate sufficient balance
            IF current_shu_balance < amount_val THEN
              RAISE EXCEPTION 'Insufficient SHU balance. Available: %, Required: %', 
                current_shu_balance, amount_val;
            END IF;
            
            UPDATE cashbook_balances 
            SET balance = balance - amount_val, updated_at = NOW()
            WHERE type IN ('total', 'shu');
            
            RAISE NOTICE 'Expense: Deducted % from SHU and total', amount_val;
            
          WHEN 'capital' THEN
            -- Capital only - validate sufficient balance
            IF current_capital_balance < amount_val THEN
              RAISE EXCEPTION 'Insufficient capital balance. Available: %, Required: %', 
                current_capital_balance, amount_val;
            END IF;
            
            UPDATE cashbook_balances 
            SET balance = balance - amount_val, updated_at = NOW()
            WHERE type IN ('total', 'capital');
            
            RAISE NOTICE 'Expense: Deducted % from capital and total', amount_val;
            
          WHEN 'auto' THEN
            -- Smart selection: prefer SHU for operational expenses
            IF current_shu_balance >= amount_val THEN
              -- Use SHU if sufficient
              UPDATE cashbook_balances 
              SET balance = balance - amount_val, updated_at = NOW()
              WHERE type IN ('total', 'shu');
              
              RAISE NOTICE 'Expense: Auto-deducted % from SHU and total', amount_val;
            ELSE
              -- Fallback to capital if SHU insufficient
              IF current_capital_balance >= amount_val THEN
                UPDATE cashbook_balances 
                SET balance = balance - amount_val, updated_at = NOW()
                WHERE type IN ('total', 'capital');
                
                RAISE NOTICE 'Expense: Auto-deducted % from capital and total (SHU insufficient)', amount_val;
              ELSE
                RAISE EXCEPTION 'Insufficient funds. SHU: %, Capital: %, Required: %', 
                  current_shu_balance, current_capital_balance, amount_val;
              END IF;
            END IF;
            
          ELSE -- 'total'
            -- Deduct from SHU by default for 'total' source
            IF current_shu_balance >= amount_val THEN
              UPDATE cashbook_balances 
              SET balance = balance - amount_val, updated_at = NOW()
              WHERE type IN ('total', 'shu');
              
              RAISE NOTICE 'Expense: Deducted % from SHU and total', amount_val;
            ELSE
              RAISE EXCEPTION 'Insufficient SHU balance for total source. Available: %, Required: %', 
                current_shu_balance, amount_val;
            END IF;
        END CASE;
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
    'DROP TRIGGER IF EXISTS trg_update_cashbook_balance ON cashbook_transactions'
  )
  await knex.raw('DROP FUNCTION IF EXISTS update_cashbook_balance')
  await knex.raw('DROP INDEX IF EXISTS idx_cashbook_balances_type')
  await knex.schema.dropTableIfExists('cashbook_balances')
}

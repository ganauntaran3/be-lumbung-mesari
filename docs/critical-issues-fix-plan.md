# Critical Issues: Implementation Fix Plan

> Companion document to `docs/comprehensive-review.md`.  
> Covers **all 8 Critical Issues** (Section 1.1 – 1.8) with file-specific, actionable steps.

---

## Table of Contents

1. [Issue 1.1 — JWT Secret Hardcoded Fallback](#issue-11--jwt-secret-hardcoded-fallback)
2. [Issue 1.2 — No Rate Limiting / Throttling](#issue-12--no-rate-limiting--throttling)
3. [Issue 1.4 — Cashbook Balance Snapshots Not Recalculated on Update](#issue-14--cashbook-balance-snapshots-not-recalculated-on-update)
4. [Issue 1.5 — Balance Snapshots Not Updated on Delete](#issue-15--balance-snapshots-not-updated-on-delete)
5. [Issue 1.6 — Expense Update Fund Check Uses New Amount Without Reversing Old](#issue-16--expense-update-fund-check-uses-new-amount-without-reversing-old)
6. [Issue 1.7 — TOCTOU Race Condition on Principal Savings Creation](#issue-17--toctou-race-condition-on-principal-savings-creation)
7. [Issue 1.8 — No Negative Balance Guard on cashbook_balances](#issue-18--no-negative-balance-guard-on-cashbook_balances)

---

## Issue 1.1 — JWT Secret Hardcoded Fallback

**Severity:** Critical  
**Files:**

- `src/auth/strategies/jwt.strategy.ts:17-20`
- `src/auth/auth.module.ts:24-27`
- `src/app.module.ts:18-21`

### Problem

Both `JwtModule.registerAsync` and `JwtStrategy` call:

```ts
configService.get<string>('JWT_SECRET', 'your-default-secret-key')
```

If `JWT_SECRET` is absent from `.env`, the app silently falls back to a known public string. Any attacker can forge valid JWT tokens that pass signature verification.

### Fix

**Step 1 — Add config validation schema in `src/app.module.ts`.**

Install the validation library if not present:

```bash
npm install joi
```

Create `src/config/env.validation.ts`:

```ts
import * as Joi from 'joi'

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h')
  // add other required env vars here
})
```

Update `src/app.module.ts`:

```ts
import { envValidationSchema } from './config/env.validation'

ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
  validationSchema: envValidationSchema // <-- add this
})
```

**Step 2 — Remove fallback defaults from `src/auth/auth.module.ts:24-27` and `src/auth/strategies/jwt.strategy.ts:17-20`.**

```ts
// auth.module.ts — before
secret: configService.get<string>('JWT_SECRET', 'your-default-secret-key'),

// auth.module.ts — after
secret: configService.getOrThrow<string>('JWT_SECRET'),
```

```ts
// jwt.strategy.ts — before
secretOrKey: configService.get<string>('JWT_SECRET', 'your-default-secret-key')

// jwt.strategy.ts — after
secretOrKey: configService.getOrThrow<string>('JWT_SECRET')
```

`getOrThrow` throws at startup if the variable is missing — validation schema provides a clear error message; `getOrThrow` is a hard backstop.

**Step 3 — Rotate the JWT secret in production** immediately after deploying, invalidating any tokens that may have been signed with the fallback string.

---

## Issue 1.2 — No Rate Limiting / Throttling

**Severity:** Critical  
**Files:**

- `src/app.module.ts`
- `src/auth/auth.controller.ts`
- `package.json` (`@nestjs/throttler` is already installed)

### Problem

`@nestjs/throttler` is in `package.json` but is unused — no `ThrottlerModule` imported, no `ThrottlerGuard` applied. OTP brute-force is the highest-risk attack vector: a 6-digit numeric OTP has only 899,999 possible values. An attacker can try all combinations in minutes against an unprotected `/auth/verify-otp` endpoint.

### Fix

**Step 1 — Register `ThrottlerModule` globally in `src/app.module.ts`.**

```ts
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute window (ms)
        limit: 60 // max 60 requests per window
      },
      {
        name: 'auth',
        ttl: 60_000,
        limit: 10 // max 10 auth attempts per minute
      }
    ])
    // ... existing modules
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard // applies default throttle globally
    }
  ]
})
export class AppModule {}
```

**Step 2 — Apply the stricter `'auth'` throttle to sensitive endpoints in `src/auth/auth.controller.ts`.**

```ts
import { Throttle, SkipThrottle } from '@nestjs/throttler'

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {

  @Throttle({ auth: { ttl: 60_000, limit: 5 } })  // 5 attempts/min
  @Post('login')
  async login(...) { ... }

  @Throttle({ auth: { ttl: 60_000, limit: 5 } })  // 5 attempts/min
  @Post('verify-otp')
  async verifyOtp(...) { ... }

  @Throttle({ auth: { ttl: 300_000, limit: 3 } }) // 3 resends per 5 min
  @Post('resend-otp')
  async resendOtp(...) { ... }

  // register is less sensitive but still throttle
  @Throttle({ auth: { ttl: 3_600_000, limit: 5 } }) // 5 registrations/hour per IP
  @Post('register')
  async register(...) { ... }

  @SkipThrottle()  // token refresh does not need throttling (already authed)
  @Post('refresh')
  async refresh(...) { ... }
}
```

**Step 3 — OTP lockout after N failures (application-level).**

Beyond IP-level throttling, track per-user failure counts. In `src/auth/auth.service.ts`, in `verifyOtp()`:

```ts
// After: if (user.otp_code !== otpCode)
// Increment otp_failed_attempts on the user record, lock if >= 5
```

This requires adding `otp_failed_attempts integer default 0` column via a new migration. Reset to `0` on successful verification or OTP regeneration.

---

## Issue 1.4 — Cashbook Balance Snapshots Not Recalculated on Update

**Severity:** Critical  
**Files:**

- `src/cashbook/cashbook-transaction.service.ts:158-190` (`updateExpenseTransaction`)
- `src/cashbook/cashbook-transaction.service.ts:192-223` (`updateIncomeTransaction`)
- `src/cashbook/cashbook-transaction.repository.ts` (underlying update methods)

### Problem

`updateExpenseTransaction` and `updateIncomeTransaction` only write:

```ts
{
  shu_amount, capital_amount, txn_date, updated_at
}
```

The snapshot columns `shu_balance_before`, `shu_balance_after`, `capital_balance_before`, `capital_balance_after`, `total_balance_before`, `total_balance_after` are never recalculated. The DB trigger (`cashbook_update_balance`) does correctly adjust `cashbook_balances` when amounts change, but the snapshot fields in `cashbook_transactions` become permanently stale, making the transaction history ledger unreliable for auditing.

### Fix

The snapshot fields record the balance **at the moment the transaction occurred**, not the current live balance. On update, the correct semantic is:

- Reverse the old transaction's effect on the running balances.
- Read the current post-reversal balances.
- Apply the new amounts.
- Store the new snapshots.

**Rewrite `updateExpenseTransaction` in `src/cashbook/cashbook-transaction.service.ts`:**

```ts
async updateExpenseTransaction(
  expenseId: string,
  newShuAmount: number,
  newCapitalAmount: number,
  txnDate?: Date,
  trx?: Knex.Transaction
): Promise<void> {
  const db = trx || this.databaseService.getKnex()

  // 1. Fetch existing transaction (needs old amounts to compute reversal)
  const existing = await db('cashbook_transactions')
    .where({ expense_id: expenseId })
    .first()

  if (!existing) {
    throw new Error(`Cashbook transaction not found for expense ${expenseId}`)
  }

  const oldShu = parseFloat(existing.shu_amount)
  const oldCapital = parseFloat(existing.capital_amount)

  // 2. Lock and read current cashbook_balances
  const balances = await db('cashbook_balances')
    .select('type', 'balance')
    .whereIn('type', ['shu', 'capital', 'total'])
    .forUpdate()

  const currentShu = parseFloat(balances.find((b) => b.type === 'shu')?.balance || '0')
  const currentCapital = parseFloat(balances.find((b) => b.type === 'capital')?.balance || '0')
  const currentTotal = parseFloat(balances.find((b) => b.type === 'total')?.balance || '0')

  // 3. The DB trigger will handle cashbook_balances.
  //    Compute what balances look like AFTER the trigger reverses the old and applies the new.
  //    (trigger reverses old 'out': adds oldShu + oldCapital back, then deducts new amounts)
  const shuBefore = currentShu + oldShu         // after reversal
  const capitalBefore = currentCapital + oldCapital
  const totalBefore = currentTotal + (oldShu + oldCapital)
  const shuAfter = shuBefore - newShuAmount
  const capitalAfter = capitalBefore - newCapitalAmount
  const totalAfter = totalBefore - (newShuAmount + newCapitalAmount)

  // 4. Update with corrected snapshots
  await db('cashbook_transactions')
    .where({ expense_id: expenseId })
    .update({
      shu_amount: newShuAmount,
      capital_amount: newCapitalAmount,
      shu_balance_before: shuBefore,
      shu_balance_after: shuAfter,
      capital_balance_before: capitalBefore,
      capital_balance_after: capitalAfter,
      total_balance_before: totalBefore,
      total_balance_after: totalAfter,
      txn_date: txnDate || existing.txn_date,
      updated_at: new Date()
    })
}
```

Apply the same pattern to `updateIncomeTransaction` (direction `'in'`: balances decrease on reversal, increase on new apply).

> **Note:** This can be simplified by removing the application-level snapshot recalculation entirely and instead deriving audit history from the trigger log. However, that requires a schema change. The approach above keeps the existing architecture intact.

---

## Issue 1.5 — Balance Snapshots Not Updated on Delete

**Severity:** Critical  
**Files:**

- `src/cashbook/cashbook-transaction.service.ts:225-244` (`deleteExpenseTransaction`)
- `src/cashbook/cashbook-transaction.service.ts:247-267` (`deleteIncomeTransaction`)

### Problem

The delete functions simply call the repository delete. The DB trigger (`cashbook_delete_balance`) correctly adjusts live `cashbook_balances`, but all other `cashbook_transactions` rows whose `*_balance_before/after` snapshots were computed relative to the deleted row are now incorrect — the ledger is inconsistent.

### Analysis

Unlike Update (where only one row's snapshots need fixing), a Delete invalidates all subsequent rows' snapshots. Recalculating every subsequent transaction's snapshots in application code is expensive and error-prone.

### Fix

**Option A (Recommended) — Soft delete instead of hard delete.**

Replace physical deletes with a `deleted_at` timestamp (soft delete). This preserves ledger integrity.

```ts
// New migration: <timestamp>_alter_cashbook_transactions_soft_delete.ts
await knex.schema.alterTable('cashbook_transactions', (table) => {
  table.timestamp('deleted_at').nullable()
})
```

In the DB trigger, modify `cashbook_delete_balance` to only trigger on actual DELETEs from archival/admin paths. For normal "deletion" from the application, instead `UPDATE cashbook_transactions SET deleted_at = NOW()` and add a separate trigger or application logic to reverse the balance effect.

Or — simpler — fire the balance reversal from application code when soft-deleting, and exclude soft-deleted rows from all queries:

```ts
async softDeleteExpenseTransaction(
  expenseId: string,
  trx: Knex.Transaction
): Promise<void> {
  // Read old amounts
  const row = await trx('cashbook_transactions')
    .where({ expense_id: expenseId })
    .first()

  if (!row) return

  // Reverse balances manually (since trigger won't fire on UPDATE)
  const shuAmount = parseFloat(row.shu_amount)
  const capitalAmount = parseFloat(row.capital_amount)
  await trx('cashbook_balances').where({ type: 'shu' }).increment('balance', shuAmount)
  await trx('cashbook_balances').where({ type: 'capital' }).increment('balance', capitalAmount)
  await trx('cashbook_balances').where({ type: 'total' }).increment('balance', shuAmount + capitalAmount)

  // Soft delete
  await trx('cashbook_transactions')
    .where({ expense_id: expenseId })
    .update({ deleted_at: new Date() })
}
```

Add `WHERE deleted_at IS NULL` to all `cashbook_transactions` queries.

**Option B — Accept stale snapshots, mark them as such.**

If snapshot fidelity for deleted rows is not a business requirement (e.g., admins never read historical balance columns from deleted entries), the current behavior is acceptable but should be documented. Snapshots on non-deleted rows are unaffected by a delete of an unrelated row.

> **Clarification:** The DB trigger already correctly restores live `cashbook_balances` on DELETE. The only concern is auditability of the `*_balance_before/after` fields on remaining rows. For most cooperative use cases, Option B is acceptable if snapshots are considered point-in-time and not a continuous ledger.

---

## Issue 1.6 — Expense Update Fund Check Uses New Amount Without Reversing Old

**Severity:** Critical  
**Files:**

- `src/expenses/expenses.service.ts:283-357` (`updateExpense`)
- `src/expenses/expenses.service.ts:42-95` (`allocateAmounts`)

### Problem

When updating an expense's amount, `allocateAmounts()` is called with the **new** amount and reads live `cashbook_balances` with `FOR UPDATE`. But the live balances already reflect the **original** expense deduction. This means:

- Original expense: 500,000 from capital
- Live capital balance: 4,500,000 (already deducted)
- Update to: 600,000
- `allocateAmounts(600_000)` checks if `4,500,000 >= 600,000` → **passes** even though the true available capital is only `4,500,000 + 500,000 (to-be-restored) = 5,000,000`

In practice this means the check is **overly conservative** (it sees a lower balance than actually available after reversal), which can cause false `InsufficientFundsError` for valid updates. In edge cases where the old expense was large, it can incorrectly block a smaller update.

Additionally, the DB trigger on UPDATE correctly reverses the old amounts and applies the new ones — so `cashbook_balances` ends up correct — but the fund check before the update uses the pre-reversal balance, making the validation logic wrong.

### Fix

Before calling `allocateAmounts`, compute the effective balance **after reversing the existing expense**:

**In `src/expenses/expenses.service.ts`, inside `updateExpense()`'s transaction block:**

```ts
// BEFORE calling allocateAmounts, restore old amounts to the locked balances
if (updateExpenseDto.amount !== undefined) {
  const oldShu = parseFloat(existingExpense.shu_amount)
  const oldCapital = parseFloat(existingExpense.capital_amount)

  // Temporarily add back the old deduction so allocateAmounts sees true available balance.
  // We do NOT modify cashbook_balances here — we just pass adjusted values.
  // Instead, extend allocateAmounts to accept optional pre-adjustment amounts.

  const { shuAmount, capitalAmount } = await this.allocateAmountsWithReversal(
    updateExpenseDto.amount,
    effectiveSource,
    trx,
    { restoreShu: oldShu, restoreCapital: oldCapital } // inject old amounts
  )
  // ...
}
```

Add a new private method `allocateAmountsWithReversal` (or extend `allocateAmounts` with an optional parameter):

```ts
private async allocateAmounts(
  totalAmount: number,
  source: 'auto' | 'total' | 'capital' | 'shu',
  trx: Knex.Transaction,
  restore?: { restoreShu: number; restoreCapital: number }
): Promise<{ shuAmount: number; capitalAmount: number }> {
  const balances = await trx('cashbook_balances')
    .select('type', 'balance')
    .whereIn('type', ['shu', 'capital'])
    .forUpdate()

  // Add back old amounts if this is an update (restoring the previous deduction)
  let shuBalance = parseFloat(balances.find((b) => b.type === 'shu')?.balance || '0')
    + (restore?.restoreShu ?? 0)
  let capitalBalance = parseFloat(balances.find((b) => b.type === 'capital')?.balance || '0')
    + (restore?.restoreCapital ?? 0)

  // rest of switch unchanged
  switch (source) {
    case ExpenseSource.SHU:
      if (shuBalance < totalAmount) throw new InsufficientFundsError(...)
      return { shuAmount: totalAmount, capitalAmount: 0 }
    // ...
  }
}
```

Call without `restore` on create (existing behavior), call with `restore` on update.

This ensures the fund check is accurate: it validates against what the balance will be _after_ the old transaction is reversed, which is exactly what the DB trigger does.

---

## Issue 1.7 — TOCTOU Race Condition on Principal Savings Creation

**Severity:** Critical  
**Files:**

- `src/users-savings/users-savings.service.ts:39-43`
- `src/savings/principal-savings.repository.ts:59-62`

### Status: Verified Fixed in Current Code

Upon reading the actual source files, this issue **has already been addressed**:

- `users-savings.service.ts` passes `trx` into `findPrincipalSavingsByUserId()`.
- `principal-savings.repository.ts` accepts `trx?: any` and uses it when provided.

The fix is confirmed present. No further action required for this specific issue.

**Recommendation:** Add an integration test to verify that concurrent OTP verifications for the same user do not create duplicate `principal_savings` rows. The database should also have a `UNIQUE` constraint on `(user_id)` in `principal_savings` as a safety net.

---

## Issue 1.8 — No Negative Balance Guard on cashbook_balances

**Severity:** Critical  
**Files:**

- `src/database/migrations/20250908023205_create_cashbook_balances_table.ts` (table definition — no CHECK constraint)
- `src/database/migrations/20251121120850_create_cashbook_triggers.ts` (trigger deducts without checking)

### Problem

The `cashbook_balances` table has no `CHECK (balance >= 0)` constraint. The DB trigger `cashbook_insert_balance` deducts balances for expense transactions without verifying the result is non-negative. Application-level checks in `allocateAmounts()` guard against this, but:

1. Any direct SQL or future code that bypasses the application layer can drive balances negative.
2. The trigger itself has no guard — it is the last line of defence and it has no guard.
3. The `cashbook_update_balance` trigger reverses old and applies new amounts without checking intermediate or final negativity.

### Fix

**Step 1 — Add a `CHECK` constraint via a new migration.**

```ts
// New migration: src/database/migrations/<timestamp>_add_cashbook_balance_check.ts
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE cashbook_balances
    ADD CONSTRAINT chk_cashbook_balance_non_negative
    CHECK (balance >= 0);
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE cashbook_balances
    DROP CONSTRAINT IF EXISTS chk_cashbook_balance_non_negative;
  `)
}
```

**Step 2 — Add a guard in the `cashbook_insert_balance` trigger** for the expense (`direction = 'out'`) path:

```sql
-- In cashbook_insert_balance(), before deducting:
IF NEW.direction = 'out' THEN
  -- Guard: check resulting balance will not go negative
  DECLARE
    current_shu DECIMAL;
    current_capital DECIMAL;
    current_total DECIMAL;
  BEGIN
    SELECT balance INTO current_shu FROM cashbook_balances WHERE type = 'shu';
    SELECT balance INTO current_capital FROM cashbook_balances WHERE type = 'capital';
    SELECT balance INTO current_total FROM cashbook_balances WHERE type = 'total';

    IF NEW.shu_amount::DECIMAL > 0 AND current_shu < NEW.shu_amount::DECIMAL THEN
      RAISE EXCEPTION 'Insufficient SHU balance: available %, required %', current_shu, NEW.shu_amount::DECIMAL;
    END IF;

    IF NEW.capital_amount::DECIMAL > 0 AND current_capital < NEW.capital_amount::DECIMAL THEN
      RAISE EXCEPTION 'Insufficient capital balance: available %, required %', current_capital, NEW.capital_amount::DECIMAL;
    END IF;
  END;
  -- ... then proceed with deduction
END IF;
```

Embed this check into the existing trigger function by replacing `cashbook_insert_balance` via a new migration that calls `CREATE OR REPLACE FUNCTION`.

**Step 3 — Verify existing data** before applying the `CHECK` constraint to avoid migration failure if stale negative values exist:

```sql
-- Run before migration:
SELECT type, balance FROM cashbook_balances WHERE balance < 0;
```

If any rows are negative, investigate root cause before adding the constraint.

---

## Implementation Order

The issues should be fixed in the following priority order to minimize risk:

| Priority | Issue                                      | Reason                                                                |
| -------- | ------------------------------------------ | --------------------------------------------------------------------- |
| 1        | **1.1 — JWT Fallback**                     | Prevents token forgery; deploy fix before anything else               |
| 2        | **1.2 — Rate Limiting**                    | Prevents OTP brute-force; fixes a hole that exists right now          |
| 3        | **1.6 — Expense Update Fund Check**        | Logic bug; incorrect fund validation on every expense update          |
| 4        | **1.4 — Snapshot Recalculation on Update** | Stale audit data accumulates with each expense update                 |
| 5        | **1.8 — Negative Balance Guard**           | Database-level safety net; low deployment risk                        |
| 6        | **1.5 — Balance Snapshots on Delete**      | Evaluate Option A vs B; coordinate with product on audit requirements |
| 7        | **1.7 — TOCTOU (already fixed)**           | Verify with tests; add UNIQUE constraint as belt-and-suspenders       |

---

## Testing Checklist

After implementing each fix, verify with the following tests:

- **1.1:** Start app without `JWT_SECRET` in `.env` → expect startup failure with clear error.
- **1.2:** Send >5 login requests/minute from same IP → expect HTTP 429.
- **1.4:** Create expense, update amount, check `cashbook_transactions.*_balance_*` fields are recalculated.
- **1.5:** Create expense, delete it, verify `cashbook_balances` matches expected value.
- **1.6:** Create expense of 1,000,000 against a balance of 1,000,000. Update to 500,000 → should succeed (not throw `InsufficientFundsError`).
- **1.7:** Concurrent OTP verification for same user → only one `principal_savings` row created.
- **1.8:** Attempt to insert a `cashbook_transactions` row that would drive a balance negative → expect DB exception.

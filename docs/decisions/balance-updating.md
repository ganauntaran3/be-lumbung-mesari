# ⚙️ Technical Decision: Balance Updating via Database Triggers

> **Decision**: Balance updates are handled automatically at the database level via PostgreSQL triggers. The application layer only creates/updates/deletes `cashbook_transactions`; the `cashbook_balances` table is never updated directly by the application.

## Context

The cooperative's financial system tracks balances across three buckets:

- **SHU** (Sisa Hasil Usaha) — operating surplus / profit sharing
- **Capital** (Modal) — member equity / capital fund
- **Total** — sum of SHU + Capital

Every financial operation (income or expense) must update these balances consistently. Doing this in application code introduces the risk of:

- Forgetting to update balances in some code path
- Race conditions between concurrent transactions
- Inconsistencies if the app crashes mid-operation

## Decision

All balance updates are delegated to **three PostgreSQL triggers** on the `cashbook_transactions` table.

**Reference**: [create_cashbook_triggers.ts](file:///home/igustingurahganauntaran/lectures/code/js/be-lumbung-mesari/src/database/migrations/20251121120850_create_cashbook_triggers.ts)

---

## Trigger Breakdown

### 1. `trg_cashbook_insert_balance` — On INSERT

**Function**: `cashbook_insert_balance()`  
**Fires**: `AFTER INSERT ON cashbook_transactions`

| Direction       | Action                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `in` (income)   | **Adds** `shu_amount` to SHU balance, `capital_amount` to Capital balance, both to Total            |
| `out` (expense) | **Subtracts** `shu_amount` from SHU balance, `capital_amount` from Capital balance, both from Total |

**Example**: An installment payment creates a cashbook transaction with `direction='in'`, `capital_amount=50000`. The trigger automatically adds 50,000 to both the `capital` and `total` balances.

### 2. `trg_cashbook_update_balance` — On UPDATE

**Function**: `cashbook_update_balance()`  
**Fires**: `AFTER UPDATE ON cashbook_transactions`

This trigger handles corrections when a transaction is modified:

1. **Reverses the old transaction** — undoes the effect of the original amounts/direction
2. **Applies the new transaction** — applies the updated amounts/direction

> Only fires when `shu_amount`, `capital_amount`, or `direction` actually changed (checked inside the function body).

**Example**: If an expense of 10,000 SHU is corrected to 15,000 SHU, the trigger first adds back the old 10,000, then subtracts the new 15,000 — net effect: -5,000 on SHU balance.

### 3. `trg_cashbook_delete_balance` — On DELETE

**Function**: `cashbook_delete_balance()`  
**Fires**: `AFTER DELETE ON cashbook_transactions`

| Direction                   | Action                                                        |
| --------------------------- | ------------------------------------------------------------- |
| `in` (income was deleted)   | **Subtracts** the amounts from balances (reverses the income) |
| `out` (expense was deleted) | **Adds** the amounts back to balances (reverses the expense)  |

---

## How the App and Triggers Work Together

```
┌─────────────────────────────────────────────┐
│              Application Code               │
│                                             │
│  1. Acquire lock:                           │
│     SELECT ... FROM cashbook_balances       │
│     FOR UPDATE                              │
│                                             │
│  2. Calculate balance snapshots             │
│     (before/after for audit trail)          │
│                                             │
│  3. INSERT into cashbook_transactions       │
│     (with balance snapshots)                │
│                                             │
└─────────────────┬───────────────────────────┘
                  │ INSERT fires trigger
                  ▼
┌─────────────────────────────────────────────┐
│           PostgreSQL Trigger                │
│                                             │
│  cashbook_insert_balance():                 │
│    UPDATE cashbook_balances                 │
│    SET balance = balance ± amount           │
│    WHERE type IN ('shu', 'capital', 'total')│
│                                             │
└─────────────────────────────────────────────┘
```

> **Key insight**: The app uses `FOR UPDATE` pessimistic locking to read balances and calculate snapshots (for the audit trail), then the trigger handles the actual `cashbook_balances` update. Both happen within the same database transaction, ensuring atomicity.

---

## Why This Matters

| Aspect                | Benefit                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Consistency**       | Impossible to create a `cashbook_transaction` without updating balances                                        |
| **Simplicity**        | Developers only need to INSERT/UPDATE/DELETE transactions — no manual balance logic                            |
| **Atomicity**         | Trigger runs in the same transaction as the DML operation — either both succeed or both rollback               |
| **Auditability**      | Balance snapshots in `cashbook_transactions` + trigger-managed `cashbook_balances` provide double verification |
| **Correction Safety** | UPDATE and DELETE triggers automatically reverse and re-apply, preventing manual math errors                   |

---

## Caveats

1. **Direct SQL edits to `cashbook_transactions`** will also trigger balance updates. This is by design but means database admins need to be careful with manual data corrections.
2. **Bulk operations** (e.g., migrating historical data) should be done carefully, as each row insert triggers a balance update.
3. The `cashbook_balances` table should **never be manually updated** — it is purely trigger-managed.

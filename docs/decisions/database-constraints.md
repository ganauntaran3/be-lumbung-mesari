# ⚙️ Technical Decision: Database-Level Constraints

> **Decision**: Critical business rules are enforced at the PostgreSQL level (triggers, CHECK constraints, UNIQUE constraints) rather than solely in application code. This provides an additional safety net that prevents invalid data from ever entering the database.

## Context

In a financial system like Lumbung Mesari, data integrity is paramount. While application-level validation is the first line of defense, it can be bypassed by:

- Direct database access (admin tools, scripts)
- Bugs in new code that don't call the right validation
- Race conditions in concurrent requests

Enforcing constraints at the database level creates an **unbreakable last line of defense**.

**Reference**: [create_constraints_business_rules.ts](file:///home/igustingurahganauntaran/lectures/code/js/be-lumbung-mesari/src/database/migrations/20250908020539_create_constraints_business_rules.ts)

---

## Constraints Implemented

### 1. Maximum Loans Per User (Trigger)

**Rule**: A user cannot have more than **3 loans** in `pending`, `approved`, or `active` status simultaneously.

```sql
CREATE OR REPLACE FUNCTION check_max_loans_per_user()
RETURNS TRIGGER AS $$
DECLARE
  loan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO loan_count
  FROM loans
  WHERE user_id = NEW.user_id
    AND status IN ('pending', 'approved', 'active')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

  IF loan_count >= 3 THEN
    RAISE EXCEPTION 'User cannot have more than 3 loans in pending/approved/active status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger**: `trg_check_max_loans` — fires `BEFORE INSERT OR UPDATE ON loans` when the new status is one of `pending`, `approved`, `active`.

**Why at DB level**: Even if the application validation is bypassed (e.g., concurrent API requests), the trigger will catch the violation. The app also handles this gracefully by catching the `DatabaseError` and returning a user-friendly `BadRequestException('User cannot have more than 3 loans')`.

---

### 2. Auto-Update `updated_at` Timestamp (Trigger)

**Rule**: The `updated_at` column is automatically set to `NOW()` on every UPDATE.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Applied to all major tables:**

| Table                   | Trigger Name                       |
| ----------------------- | ---------------------------------- |
| `users`                 | `trg_update_users`                 |
| `loans`                 | `trg_update_loans`                 |
| `loan_periods`          | `trg_update_loan_periods`          |
| `installments`          | `trg_update_installments`          |
| `mandatory_savings`     | `trg_update_mandatory_savings`     |
| `principal_savings`     | `trg_update_principal_savings`     |
| `incomes`               | `trg_update_incomes`               |
| `expenses`              | `trg_update_expenses`              |
| `cashbook_transactions` | `trg_update_cashbook_transactions` |

**Why at DB level**: Ensures consistency regardless of how the data is modified. Direct SQL updates, application code, or migration scripts — `updated_at` is always accurate.

---

### 3. CHECK Constraints

| Constraint                      | Table                   | Rule                              | Purpose                          |
| ------------------------------- | ----------------------- | --------------------------------- | -------------------------------- |
| `chk_expense_amounts_positive`  | `expenses`              | `shu_amount + capital_amount > 0` | Prevents zero-value expenses     |
| `chk_cashbook_amounts_positive` | `cashbook_transactions` | `shu_amount + capital_amount > 0` | Prevents zero-value transactions |

---

### 4. UNIQUE Constraints

| Table                | Columns                         | Purpose                                                        |
| -------------------- | ------------------------------- | -------------------------------------------------------------- |
| `installments`       | `(loan_id, installment_number)` | Prevents duplicate installment numbers within a loan           |
| `mandatory_savings`  | `(user_id, period_date)`        | Prevents duplicate savings records for the same user and month |
| `users`              | `email`                         | Unique email addresses                                         |
| `users`              | `username`                      | Unique usernames                                               |
| `roles`              | `name`                          | Unique role names                                              |
| `income_categories`  | `code`                          | Unique category codes                                          |
| `expense_categories` | `code`                          | Unique category codes                                          |
| `cashbook_balances`  | `type`                          | Only one row per balance type (shu, capital, total)            |

---

### 5. Foreign Key Constraints with Delete Rules

| Relationship                                  | ON DELETE  | Rationale                                            |
| --------------------------------------------- | ---------- | ---------------------------------------------------- |
| `users.role_id → roles`                       | `RESTRICT` | Cannot delete a role if users are assigned to it     |
| `loans.user_id → users`                       | `RESTRICT` | Cannot delete a user with existing loans             |
| `installments.loan_id → loans`                | `CASCADE`  | Deleting a loan removes all its installments         |
| `incomes.loan_id → loans`                     | `SET NULL` | Deleting a loan nullifies income references          |
| `expenses.loan_id → loans`                    | `RESTRICT` | Cannot delete a loan with related expenses           |
| `cashbook_transactions.income_id → incomes`   | `CASCADE`  | Deleting an income removes its cashbook transaction  |
| `cashbook_transactions.expense_id → expenses` | `CASCADE`  | Deleting an expense removes its cashbook transaction |
| `notifications.user_id → users`               | `CASCADE`  | Deleting a user removes their notifications          |

---

## Summary

```
┌──────────────────────────────────────────────────────────┐
│                   Validation Layers                      │
│                                                          │
│   Layer 1: DTO Validation (class-validator)               │
│   ├── Syntactic: required fields, types, formats         │
│   └── Basic: min/max values, string lengths              │
│                                                          │
│   Layer 2: Service Logic                                 │
│   ├── Status checks (e.g., can't approve a rejected loan)│
│   └── Business rules (e.g., sufficient balance)          │
│                                                          │
│   Layer 3: Database Constraints ← THIS DOCUMENT          │
│   ├── Triggers: max loans, auto-updated_at               │
│   ├── CHECK: positive amounts                            │
│   ├── UNIQUE: no duplicates                              │
│   └── FOREIGN KEY: referential integrity                 │
└──────────────────────────────────────────────────────────┘
```

Database constraints serve as the **final safety net**. Even if Layers 1 and 2 are bypassed or contain bugs, Layer 3 ensures the database always contains valid, consistent data.

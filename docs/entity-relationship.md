# 🗂️ Lumbung Mesari — Entity Relationship Diagram

> **Note:** This ERD reflects the **actual database schema** as implemented in the migration files. The previous `cooperative-erd.md` was a design document; this represents the live schema.

## Entity Relationship Diagram

```mermaid
erDiagram
    %% ─── User Management ───
    roles ||--o{ users : "has"
    users ||--o{ loans : "requests"
    users ||--o{ mandatory_savings : "pays"
    users ||--o{ principal_savings : "pays"
    users ||--o{ notifications : "receives"
    users ||--o{ audit_logs : "triggers"
    users ||--o{ email_logs : "receives"
    users ||--o{ expenses : "creates"

    %% ─── Loan Management ───
    loan_periods ||--o{ loans : "defines"
    loans ||--o{ installments : "has"
    loans ||--o{ incomes : "generates"
    loans ||--o{ expenses : "generates"

    %% ─── Installment → Income ───
    installments ||--o{ incomes : "generates"

    %% ─── Savings → Income ───
    principal_savings ||--o{ incomes : "generates"
    mandatory_savings ||--o{ incomes : "generates"

    %% ─── Income/Expense → Cashbook ───
    income_categories ||--o{ incomes : "categorizes"
    expense_categories ||--o{ expenses : "categorizes"
    incomes ||--o| cashbook_transactions : "generates"
    expenses ||--o| cashbook_transactions : "generates"

    %% ─── Notifications ───
    notification_types ||--o{ notifications : "defines"

    %% ─── Table Definitions ───
    roles {
        string id PK
        string name UK "e.g. member, administrator"
    }

    users {
        uuid id PK "UUIDv7"
        string email UK
        string fullname
        string username UK
        string password "bcrypt hashed"
        string phone_number
        text address
        enum status "pending|waiting_deposit|active|inactive|rejected"
        string role_id FK
        string otp "nullable, 6-digit"
        timestamp otp_expires_at "nullable"
        boolean otp_verified "default: false"
        timestamp created_at
        timestamp updated_at
    }

    loan_periods {
        uuid id PK
        integer tenor "months"
        decimal interest_rate "e.g. 0.01 = 1%"
        timestamp created_at
        timestamp updated_at
    }

    loans {
        uuid id PK
        uuid user_id FK
        uuid loan_period_id FK
        decimal principal_amount "Jumlah pokok"
        decimal admin_fee_amount "2% of principal"
        decimal disbursed_amount "principal - admin_fee"
        decimal interest_amount "monthly interest in IDR"
        decimal monthly_payment "monthly total"
        decimal last_month_payment "remainder adjustment"
        decimal total_payable_amount "principal + total interest"
        integer installment_late_amount "nullable"
        date disbursed_at "nullable"
        date start_date
        date end_date
        enum status "pending|approved|rejected|active|completed"
        text notes "nullable"
        uuid approved_by FK "nullable"
        timestamp approved_at "nullable"
        timestamp created_at
        timestamp updated_at
    }

    installments {
        uuid id PK
        uuid loan_id FK "CASCADE delete"
        integer installment_number
        date due_date "20th of each month"
        decimal principal_amount
        decimal interest_amount
        decimal penalty_amount "default: 0"
        decimal total_amount
        date paid_at "nullable"
        decimal paid_amount "nullable"
        enum status "due|paid|overdue|partial"
        uuid processed_by FK "nullable"
        timestamp created_at
        timestamp updated_at
    }

    principal_savings {
        uuid id PK
        uuid user_id FK
        decimal amount
        enum status "paid|pending|cancelled"
        uuid processed_by FK "nullable"
        timestamp paid_at "nullable"
        timestamp created_at
        timestamp updated_at
    }

    mandatory_savings {
        uuid id PK
        uuid user_id FK
        date period_date "1st of month"
        decimal amount
        enum status "due|paid|overdue"
        timestamp paid_at "nullable"
        uuid processed_by FK "nullable"
        timestamp created_at
        timestamp updated_at
    }

    income_categories {
        uuid id PK
        string code UK "e.g. principal_savings, loan_interest"
        string name "e.g. Simpanan Pokok"
        text description "nullable"
        enum default_destination "capital|shu"
        timestamp created_at
        timestamp updated_at
    }

    incomes {
        uuid id PK
        string name
        uuid income_category_id FK
        decimal amount
        uuid loan_id FK "nullable"
        uuid installment_id FK "nullable"
        uuid principal_saving_id FK "nullable"
        uuid mandatory_saving_id FK "nullable"
        text notes "nullable"
        timestamp txn_date
        timestamp created_at
        timestamp updated_at
    }

    expense_categories {
        uuid id PK
        string code UK "e.g. operational"
        string name "e.g. Biaya Operasional"
        text description "nullable"
        enum default_source "auto|total|capital|shu"
        timestamp created_at
        timestamp updated_at
    }

    expenses {
        uuid id PK
        uuid expense_category_id FK
        string name
        decimal shu_amount "default: 0"
        decimal capital_amount "default: 0"
        uuid loan_id FK "nullable"
        text notes "nullable"
        enum source "auto|total|capital|shu, nullable"
        date txn_date
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    cashbook_transactions {
        uuid id PK
        date txn_date
        enum direction "in|out"
        decimal shu_amount "default: 0"
        decimal capital_amount "default: 0"
        decimal shu_balance_before
        decimal shu_balance_after
        decimal capital_balance_before
        decimal capital_balance_after
        decimal total_balance_before
        decimal total_balance_after
        uuid income_id FK "nullable"
        uuid expense_id FK "nullable"
        timestamp created_at
        timestamp updated_at
    }

    cashbook_balances {
        uuid id PK
        string type UK "total|capital|shu"
        decimal balance "default: 0"
        timestamp updated_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK "nullable"
        string action
        string entity_type
        string entity_id
        jsonb old_values
        jsonb new_values
        string ip_address
        string user_agent
        timestamp created_at
    }

    notification_types {
        uuid id PK
        string name UK
        text description
        text template
        timestamp created_at
        timestamp updated_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        uuid notification_type_id FK
        string title
        text message
        jsonb data
        boolean is_read "default: false"
        timestamp read_at
        timestamp created_at
        timestamp updated_at
    }

    email_logs {
        uuid id PK
        uuid user_id FK "nullable"
        string email
        string subject
        text body
        string status
        text error "nullable"
        timestamp created_at
        timestamp updated_at
    }
```

---

## Table Summary

| Table                   | Rows Type   | Description                                           |
| ----------------------- | ----------- | ----------------------------------------------------- |
| `roles`                 | Reference   | User role definitions                                 |
| `users`                 | Master      | Member/admin accounts                                 |
| `loan_periods`          | Reference   | Predefined loan tenor + interest rate options         |
| `loans`                 | Transaction | Loan applications and their lifecycle                 |
| `installments`          | Transaction | Monthly payment schedule per loan                     |
| `principal_savings`     | Transaction | One-time membership fee payments                      |
| `mandatory_savings`     | Transaction | Monthly mandatory savings per member                  |
| `income_categories`     | Reference   | Categories for income records                         |
| `incomes`               | Transaction | All income entries (savings, installments, penalties) |
| `expense_categories`    | Reference   | Categories for expense records                        |
| `expenses`              | Transaction | All expense entries with source allocation            |
| `cashbook_transactions` | Ledger      | Immutable financial ledger with balance snapshots     |
| `cashbook_balances`     | Aggregate   | Current balance totals (SHU, Capital, Total)          |
| `audit_logs`            | Audit       | Administrative action trail                           |
| `notification_types`    | Reference   | Notification templates                                |
| `notifications`         | Transaction | User notification records                             |
| `email_logs`            | Audit       | Email delivery tracking                               |

---

## Key Indexes

| Index                          | Table               | Columns                         | Purpose                  |
| ------------------------------ | ------------------- | ------------------------------- | ------------------------ |
| `installments_loan_due_idx`    | `installments`      | `loan_id, due_date, status`     | Fast overdue lookup      |
| `mandatory_savings_period_idx` | `mandatory_savings` | `period_date, status`           | Period-based queries     |
| `notifications_user_id_idx`    | `notifications`     | `user_id`                       | User notifications       |
| `notifications_unread_idx`     | `notifications`     | `user_id WHERE is_read = false` | Partial index for unread |
| `idx_cashbook_balances_type`   | `cashbook_balances` | `type`                          | Fast balance lookup      |

---

## Key Constraints

| Constraint                                  | Type                           | Description                                                |
| ------------------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| `check_max_loans_per_user`                  | Trigger (BEFORE INSERT/UPDATE) | Max 3 loans per user in pending/approved/active status     |
| `chk_expense_amounts_positive`              | CHECK                          | `shu_amount + capital_amount > 0` on expenses              |
| `chk_cashbook_amounts_positive`             | CHECK                          | `shu_amount + capital_amount > 0` on cashbook_transactions |
| `installments(loan_id, installment_number)` | UNIQUE                         | No duplicate installment numbers per loan                  |
| `mandatory_savings(user_id, period_date)`   | UNIQUE                         | One savings record per user per month                      |

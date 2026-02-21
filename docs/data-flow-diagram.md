# 📊 Lumbung Mesari — Data Flow Diagrams

## 1. Member Registration & Activation Flow

```mermaid
sequenceDiagram
    participant M as Member
    participant API as Auth API
    participant DB as PostgreSQL
    participant Email as Email Service

    M->>API: POST /api/auth/register
    API->>DB: Create user (status: pending)
    API->>DB: Generate OTP
    API->>Email: Send OTP verification email
    API-->>M: 201 Created (userId)

    M->>API: POST /api/auth/verify-otp
    API->>DB: Verify OTP
    API->>DB: Update user status → waiting_deposit
    API->>DB: Create principal_savings (status: pending)
    API-->>M: 200 OK

    Note over M,DB: Admin reviews and approves member

    M->>API: POST /api/users/:id/approve (Admin)
    API->>DB: BEGIN TRANSACTION
    API->>DB: Update principal_savings → paid
    API->>DB: Create income (principal_savings category)
    API->>DB: Create cashbook_transaction (direction: in)
    Note over DB: Trigger: cashbook_balances auto-updated
    API->>DB: Update user status → active
    API->>DB: COMMIT
    API-->>M: 200 OK (Member activated)
```

---

## 2. Loan Lifecycle Flow

```mermaid
sequenceDiagram
    participant M as Member
    participant API as Loans API
    participant DB as PostgreSQL

    M->>API: POST /api/loans (Create loan)
    API->>DB: Validate max 3 loans constraint
    API->>DB: Calculate loan details
    API->>DB: Insert loan (status: pending)
    API-->>M: 201 Created

    Note over M,DB: Admin reviews loan application

    M->>API: POST /api/loans/:id/approve (Admin)
    API->>DB: Update loan status → approved
    API-->>M: 200 OK

    M->>API: POST /api/loans/:id/disburse (Admin)
    API->>DB: BEGIN TRANSACTION
    API->>DB: Update loan status → active, set disbursed_at
    API->>DB: Generate installments (due on 20th each month)
    API->>DB: COMMIT
    API-->>M: 200 OK (Installments generated)

    loop Monthly Payment (Each Installment)
        M->>API: POST /api/loans/installments/:id/settle (Admin)
        API->>DB: BEGIN TRANSACTION
        API->>DB: Mark installment as paid
        API->>DB: Create income: principal → CAPITAL
        API->>DB: Create cashbook_transaction (in, capital)
        API->>DB: Create income: interest → SHU
        API->>DB: Create cashbook_transaction (in, shu)
        opt If penalty > 0
            API->>DB: Create income: penalty → SHU
            API->>DB: Create cashbook_transaction (in, shu)
        end
        Note over DB: Trigger: cashbook_balances auto-updated
        API->>DB: COMMIT
    end
```

---

## 3. Cashbook Transaction Flow (Income)

This diagram shows how any income event flows through the system.

```mermaid
flowchart TD
    A[Income Event] --> B{Source Type}

    B --> C[Principal Savings Settlement]
    B --> D[Mandatory Savings Settlement]
    B --> E[Installment Payment]

    C --> F["IncomesService.createPrincipalSavingsIncome()"]
    D --> G["IncomesService.createMandatorySavingsIncome()"]
    E --> H["IncomesService.createInstallmentPrincipalIncome()"]
    E --> I["IncomesService.createInstallmentInterestIncome()"]
    E --> J["IncomesService.createInstallmentPenaltyIncome()"]

    F --> K["CashbookTransactionService.createIncomeTransaction()"]
    G --> K
    H --> K
    I --> K
    J --> K

    K --> L[Lock cashbook_balances FOR UPDATE]
    L --> M[Calculate balance snapshots]
    M --> N[INSERT into cashbook_transactions]
    N --> O["DB TRIGGER: cashbook_insert_balance()"]
    O --> P[UPDATE cashbook_balances automatically]

    style O fill:#f59e0b,stroke:#d97706,color:#000
    style P fill:#10b981,stroke:#059669,color:#fff
```

---

## 4. Cashbook Transaction Flow (Expense)

```mermaid
flowchart TD
    A[Admin Creates Expense] --> B["ExpensesService.createExpense()"]
    B --> C["ExpensesService.allocateAmounts()"]
    C --> D{Source Type?}

    D -->|auto| E["Deduct from SHU first, then Capital"]
    D -->|shu| F["Deduct from SHU only"]
    D -->|capital| G["Deduct from Capital only"]
    D -->|total| H["Split proportionally"]

    E --> I[Create expense record]
    F --> I
    G --> I
    H --> I

    I --> J["CashbookTransactionService.createExpenseTransaction()"]
    J --> K[Lock cashbook_balances FOR UPDATE]
    K --> L[Calculate balance snapshots]
    L --> M[INSERT into cashbook_transactions direction=out]
    M --> N["DB TRIGGER: cashbook_insert_balance()"]
    N --> O[UPDATE cashbook_balances automatically]

    style N fill:#f59e0b,stroke:#d97706,color:#000
    style O fill:#10b981,stroke:#059669,color:#fff
```

---

## 5. Overdue & Penalty Processing Flow

```mermaid
flowchart TD
    A["CRON: 21st of every month, midnight"] --> B["LoansScheduler.checkOverdueInstallments()"]
    B --> C["LoansService.processOverdueInstallments()"]
    C --> D["Find all 'due' installments past due_date"]
    D --> E["Group by loan_id"]

    E --> F["For each loan:"]
    F --> G["Count consecutive overdue installments"]
    G --> H["Mark all newly due installments as 'overdue'"]

    H --> I{"≥ 2 consecutive\noverdue?"}
    I -->|Yes| J["Apply ONE penalty\n(1% × principal_amount)\nto earliest overdue installment"]
    I -->|No| K["No penalty applied"]

    J --> L["installments.penalty_amount updated"]
    K --> L

    style A fill:#6366f1,stroke:#4f46e5,color:#fff
    style J fill:#ef4444,stroke:#dc2626,color:#fff
```

---

## 6. Mandatory Savings Flow

```mermaid
flowchart TD
    A["CRON: Jan 1st yearly\nor Manual: /api/savings/generate"] --> B["Generate mandatory_savings\nfor all active members\n(12 monthly records)"]

    B --> C["Each record:\nstatus=due, period_date=1st of month"]

    D["Admin settles savings"] --> E["POST /api/savings/mandatory/:id/settle"]
    E --> F["BEGIN TRANSACTION"]
    F --> G["Update mandatory_savings → paid"]
    G --> H["Create income (mandatory_savings category)"]
    H --> I["Create cashbook_transaction (in, capital)"]
    I --> J["DB TRIGGER: update balances"]
    J --> K["COMMIT"]

    style A fill:#6366f1,stroke:#4f46e5,color:#fff
    style J fill:#f59e0b,stroke:#d97706,color:#000
```

---

## 7. Balance Architecture Overview

```mermaid
flowchart LR
    subgraph "Application Level"
        A[Income Events] --> B[incomes table]
        C[Expense Events] --> D[expenses table]
        B --> E[cashbook_transactions]
        D --> E
    end

    subgraph "Database Level (Triggers)"
        E -->|INSERT| F["trg_cashbook_insert_balance"]
        E -->|UPDATE| G["trg_cashbook_update_balance"]
        E -->|DELETE| H["trg_cashbook_delete_balance"]
        F --> I[cashbook_balances]
        G --> I
        H --> I
    end

    subgraph "Balance Buckets"
        I --> J["SHU Balance"]
        I --> K["Capital Balance"]
        I --> L["Total Balance"]
    end

    style F fill:#f59e0b,stroke:#d97706,color:#000
    style G fill:#f59e0b,stroke:#d97706,color:#000
    style H fill:#f59e0b,stroke:#d97706,color:#000
    style I fill:#10b981,stroke:#059669,color:#fff
```

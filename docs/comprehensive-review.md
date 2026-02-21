# Comprehensive Code Review Report: `be-lumbung-mesari`

**Review Date:** February 17, 2026
**Scope:** Full codebase review - all modules, services, repositories, controllers, DTOs, migrations, seeds, schedulers, and configuration
**Total Issues Found:** 63 (8 Critical, 12 High, 24 Medium, 19 Low)

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [High Issues](#2-high-issues)
3. [Medium Issues](#3-medium-issues)
4. [Unused Code](#4-unused-code)
5. [Debug Code Left in Production](#5-debug-code-left-in-production)
6. [Architectural Issues](#6-architectural-issues)
7. [DTO Validation Gaps](#7-dto-validation-gaps)
8. [Migration & Seed Issues](#8-migration--seed-issues)
9. [Priority Recommendation](#9-priority-recommendation)

---

## 1. Critical Issues

> These must be fixed immediately. They represent security vulnerabilities and data integrity bugs that can cause real financial harm.

### 1.1 Hardcoded JWT Fallback Secret

**Files:** `src/auth/strategies/jwt.strategy.ts:19`, `src/auth/auth.module.ts:25`

Both locations use `'your-default-secret-key'` as a fallback when `JWT_SECRET` is not set:

```ts
secretOrKey: configService.get<string>('JWT_SECRET', 'your-default-secret-key')
```

If `JWT_SECRET` is missing from the environment, the application silently starts with a trivially guessable secret. An attacker could forge arbitrary JWTs. The application should **fail to start** if `JWT_SECRET` is undefined rather than falling back to a default.

**Recommendation:** Remove the fallback. Use NestJS `ConfigModule` validation schema to make `JWT_SECRET` required, or throw an error during bootstrap if unset.

---

### 1.2 No Rate Limiting Anywhere (OTP Brute-Force Vulnerability)

**Files:** All auth endpoints, `package.json:43`

`@nestjs/throttler` is installed in `package.json` but **never configured or applied** anywhere in the codebase. There is:

- No `ThrottlerModule` import in `AppModule`
- No `ThrottlerGuard` applied to any controller
- No attempt counter or lockout mechanism for failed OTP/login attempts

A 6-digit OTP has only 900,000 possible values. Without rate limiting, an attacker can brute-force it in minutes. The login endpoint is similarly unprotected against credential stuffing attacks.

**Recommendation:** Configure `ThrottlerModule` in `AppModule` and apply `ThrottlerGuard` globally or at minimum on `POST /auth/login`, `POST /auth/verify-otp`, and `POST /auth/resend-otp`. Add an OTP attempt counter that locks the account after N failed attempts.

---

### 1.3 OTP Stored in Plaintext + Timing-Unsafe Comparison

**File:** `src/auth/auth.service.ts:176`

```ts
if (user.otp_code !== otpCode) {
```

Two issues:

1. **Timing attack:** The `!==` comparison short-circuits on the first mismatched character, leaking information about correct OTP digits through response time.
2. **Plaintext storage:** OTP codes are stored as plaintext in the database (`src/auth/auth.service.ts:70-73`, lines 109-118). If the database is compromised, all pending OTPs are immediately exposed.

**Recommendation:** Use `crypto.timingSafeEqual()` for comparison. Hash OTPs (e.g., SHA-256) before storage, similar to password handling.

---

### 1.4 `updateExpenseTransaction` Doesn't Recalculate Balance Snapshots

**File:** `src/cashbook/cashbook-transaction.service.ts:158-190`

When an expense transaction is updated (amount changes), only `shu_amount`, `capital_amount`, and `txn_date` are updated. The balance snapshot fields (`shu_balance_before`, `shu_balance_after`, `capital_balance_before`, `capital_balance_after`, `total_balance_before`, `total_balance_after`) are **NOT recalculated**.

This means the cashbook transaction record will have incorrect balance history after any update, corrupting the financial audit trail.

**Recommendation:** Recalculate all balance snapshots when updating transaction amounts, similar to how `createExpenseTransaction` calculates them. Lock and read current balances, reverse the old amounts, and apply new amounts within a transaction.

---

### 1.5 Delete Transactions Don't Reverse Cashbook Balances

**Files:** `src/cashbook/cashbook-transaction.service.ts:225-267`

Deleting expense/income transactions removes the record but does **NOT** restore the balance impact in `cashbook_balances`. The `createExpenseTransaction` method adjusts balances via a DB trigger, but deletion appears to just remove the row without reversing the balance.

This means the cashbook balance is permanently skewed after any deletion.

**Recommendation:** Before deleting a transaction record, reverse its balance impact by reading the transaction's amounts and adjusting `cashbook_balances` accordingly, all within a transaction.

---

### 1.6 Expense Update Doesn't Account for Existing Allocated Amount

**File:** `src/expenses/expenses.service.ts:290-310`

When updating an expense amount, `allocateAmounts()` checks if there are sufficient funds for the NEW amount without first adding back the OLD amount.

**Example:** If balance is 100, existing expense is 80 (balance already reduced to 20), and you update to 90, the check sees balance=20 vs needed=90 and throws `InsufficientFundsError`. But the correct available funds = 20 + 80 = 100, which is >= 90.

**Recommendation:** Before checking funds for the new amount, restore the old expense amount to the available balance, then validate and allocate the new amount.

---

### 1.7 `settlePrincipalSavings` Reads Outside Transaction (TOCTOU Race Condition)

**File:** `src/users-savings/users-savings.service.ts:39-40`

```ts
const principalSavings =
  await this.principalSavingsRepository.findPrincipalSavingsByUserId(userId)
```

This method receives a `trx` parameter but doesn't pass it to the repository call. The read happens outside the transaction, creating a TOCTOU (time-of-check-time-of-use) race condition. Between the read and the update on line 53, another concurrent request could modify the same record.

**Recommendation:** Pass `trx` to `findPrincipalSavingsByUserId`. The repository method needs a `trx?` parameter added.

---

### 1.8 No Negative Balance Guard in Cashbook

**File:** `src/database/migrations/20251121120850_create_cashbook_triggers.ts:37-57`

The expense (direction = 'out') trigger deducts from balances without checking if the result would be negative. There is no `CHECK (balance >= 0)` constraint on the `cashbook_balances` table either. The system can process expenses that make the balance negative, which is invalid for a financial system.

**Recommendation:** Add a `CHECK (balance >= 0)` constraint on `cashbook_balances.balance` via a new migration. Also add a validation check in the trigger before deducting.

---

## 2. High Issues

### 2.1 CORS Fully Open

**File:** `src/main.ts:35`

```ts
app.enableCors()
```

Called with no arguments, this enables CORS for **all origins**. Any website can make authenticated requests to this API.

**Recommendation:** Configure explicit allowed origins:

```ts
app.enableCors({ origin: ['https://yourdomain.com'], credentials: true })
```

---

### 2.2 Swagger Exposed in Production with Hardcoded Credentials

**Files:** `src/main.ts:39-55`, `src/auth/auth.controller.ts:78-94`

Swagger documentation at `/docs` is set up unconditionally with no environment check. The Swagger examples contain actual credential pairs:

- `admin@lumbungmesari.com` / `admin123`
- `joko_widodo` / `member123`

**Recommendation:** Only enable Swagger in non-production environments. Remove hardcoded credentials from examples.

```ts
if (configService.get('NODE_ENV') !== 'production') {
  // Swagger setup...
}
```

---

### 2.3 Refresh Token Shares Secret, No Rotation/Revocation

**File:** `src/auth/auth.service.ts:277-299`

Problems:

1. Both access and refresh tokens are signed with the same secret -- no differentiation
2. No token rotation -- old refresh tokens remain valid after generating new ones
3. No token revocation -- no way to invalidate tokens on password change, logout, or compromise
4. The refresh endpoint accepts the current access token, not specifically the refresh token

**Recommendation:** Use separate secrets for access and refresh tokens. Implement server-side token tracking (e.g., in database or Redis) with rotation on each refresh.

---

### 2.4 Cashbook Balances Exposed to All Users

**File:** `src/cashbook/cashbook.controller.ts:27-49`

`GET /cashbook/balances` requires only `JwtAuthGuard` -- any authenticated user (including regular members) can see the cooperative's total financial balances (total, capital, SHU). Financial summaries should likely be restricted to admins.

**Recommendation:** Add `@UseGuards(RolesGuard)` and `@Roles('administrator', 'superadministrator')`.

---

### 2.5 `isDevelopment` Variable Is Inverted in Notification Module

**File:** `src/notifications/notification.module.ts:18-19`

```ts
const isDevelopment = configService.get<string>('NODE_ENV') === 'production'
```

Named `isDevelopment` but checks for `'production'`. This causes:

- In production: `ignoreTLS: true` (insecure -- ignoring TLS)
- In development: `secure: false`, `ignoreTLS: false`

The behavior is the opposite of what the variable name suggests.

**Recommendation:** Fix the naming or the comparison:

```ts
const isProduction = configService.get<string>('NODE_ENV') === 'production'
// secure: isProduction, ignoreTLS: !isProduction
```

---

### 2.6 JWT Validate Ignores Current User Status/Role

**File:** `src/auth/strategies/jwt.strategy.ts:24-38`

The JWT strategy checks if the user exists but does **not** verify:

- If the user is now `INACTIVE`, `REJECTED`, or `SUSPENDED`
- If the user's role has changed

Both `status` and `role` are returned from the **JWT payload** (stale data from token issuance), not from the current database state. A banned user's token continues to work until expiry.

**Recommendation:** Check user status from the database in `validate()` and reject tokens for inactive/suspended users. Cache the result to reduce DB load.

---

### 2.7 CASCADE Delete on Financial Installments

**File:** `src/database/migrations/20250825085945_create_installments_table.ts:10`

```ts
.onDelete('CASCADE')
```

Deleting a loan cascades to delete all installments. In a financial system, this destroys audit history. Loan records and their installments should be preserved.

**Recommendation:** Change to `RESTRICT` or `SET NULL` to prevent accidental data loss. Use soft deletes for financial records.

---

### 2.8 `console.log(memberDataMap)` Leaking PII in Production

**File:** `src/reports/reports.service.ts:63`

```ts
console.log(memberDataMap)
```

Dumps the entire member data map (names, user IDs, monthly financial data) to stdout on every report generation. This is both a PII leak and a performance concern.

**Recommendation:** Remove the `console.log` statement entirely, or replace with a `this.logger.debug()` that only fires in development.

---

### 2.9 Sensitive Data in Error Messages

**Files:**

- `src/expenses/exceptions/expense.exceptions.ts:38-45`: Leaks actual balance amount: `Insufficient funds from ${source}. Amount: ${amount}, Balance: ${balance}`
- `src/users/exceptions/user.exceptions.ts:8-18`: Leaks email address and action type

**Recommendation:** Remove specific financial figures and PII from error messages. Use generic messages with internal logging.

---

### 2.10 Loan Creation Doesn't Check User Status

**File:** `src/loans/loans.service.ts:221`

Any authenticated user can create a loan, including `PENDING`, `WAITING_DEPOSIT`, or `SUSPENDED` users. There is no status validation.

**Recommendation:** Add a check that the user's status is `ACTIVE` before allowing loan creation.

---

### 2.11 Reports Controller Manual Validation Instead of DTO

**File:** `src/reports/reports.controller.ts:154-171`

The `generateMonthlyFinancialReport` endpoint manually validates `month` and `year` in the controller body using `res.status().json()` directly, bypassing NestJS's exception layer. The `year` parameter at line 71 has no validation at all -- `year=abc` passes through as `NaN`.

**Recommendation:** Create a proper query DTO with `@IsInt`, `@Min(1)`, `@Max(12)` etc. Use `BadRequestException` instead of raw response.

---

### 2.12 No Distributed Lock on Cron Jobs

**Files:** `src/savings/savings.scheduler.ts`, `src/loans/loans.scheduler.ts`

Neither scheduler uses a distributed lock. In a multi-instance deployment, both instances fire the same cron job simultaneously. The loans scheduler could apply duplicate penalties.

**Recommendation:** Implement `pg_advisory_lock` or a Redis-based lock before processing.

---

## 3. Medium Issues

### 3.1 `rejectUser` Returns Wrong Status

**File:** `src/users/users.service.ts:345-349`

```ts
return {
  message: 'User rejected successfully',
  status: UserStatus.WAITING_DEPOSIT,  // Bug: Should be UserStatus.REJECTED
  userId: userId
}
```

The user's status is updated to `REJECTED` on line 311, but the response returns `WAITING_DEPOSIT`.

---

### 3.2 `applyDefaultDateRange` Is a No-Op

**File:** `src/savings/savings.service.ts:192-204`

```ts
private applyDefaultDateRange(queryParams: SavingsQueryDto): SavingsQueryDto {
  if (queryParams.period) {
    return queryParams
  }
  const defaultDateRangeDays = this.getDefaultDateRangeDays()
  this.logger.debug(`Applying default date range of ${defaultDateRangeDays} days`)
  return queryParams  // Returns unchanged queryParams!
}
```

The method calculates `defaultDateRangeDays` but never applies it to `queryParams`. The default date range feature is completely broken.

---

### 3.3 Penalty Calculation Uses `interest_rate` Directly as Multiplier

**File:** `src/loans/loans.service.ts:103-106`

```ts
const penaltyAmount = new Decimal(loan.principal_amount)
  .mul(loan.interest_rate)
  .toNumber()
```

The comment says "1% of principal" but it multiplies by `interest_rate`. If `interest_rate` is stored as a percentage number (e.g., `1` for 1%), this calculates penalty as 100% of principal.

---

### 3.4 Consecutive Overdue Count Includes Future `due` Installments

**File:** `src/loans/loans.service.ts:117-124`

```ts
if (installment.status === 'due' || installment.status === 'overdue') {
  consecutiveOverdueCount++
}
```

Counts future `'due'` installments (not yet past their due date) the same as `'overdue'`, inflating the consecutive overdue count and potentially triggering unwarranted suspension.

---

### 3.5 Loan End Date Calculation Month Overflow

**File:** `src/loans/loans.service.ts:252-254`

```ts
const endDate = new Date()
endDate.setMonth(endDate.getMonth() + tenor)
```

JavaScript's `setMonth` silently shifts when the current day exceeds the target month's days. Example: Jan 31 + 1 month = March 3 instead of February 28.

---

### 3.6 Monthly Financial Report Uses Current Balance as Opening Balance

**File:** `src/reports/reports.service.ts:276-278`

```ts
const balances = await this.cashbookBalanceRepository.getAllBalances()
const openingBalance = balances.total || 0
```

The "opening balance" is the **current** total balance, not the balance at the start of the reporting month. Historical reports will be incorrect. The saldo calculation at line 312 (`openingBalance + totalDebet - totalKredit`) also double-counts since the opening balance already includes the month's transactions.

---

### 3.7 No Environment Variable Validation at Startup

**File:** `src/app.module.ts:18-20`

```ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env'
})
```

NestJS `ConfigModule` supports a `validationSchema` option (via Joi) to ensure all required environment variables are present and valid at startup. None is used. Critical variables like `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, and `SMTP_HOST` could silently be `undefined`, leading to runtime failures or security fallbacks.

---

### 3.8 Database SSL Hardcoded to `false`

**File:** `src/database/database.config.ts:14`

```ts
ssl: false
```

SSL is hardcoded to `false` with no environment-based override. Production database connections would be unencrypted, vulnerable to MITM attacks and credential sniffing.

---

### 3.9 `phone_number` Not Unique in Users Table

**File:** `src/database/migrations/20250531160815_create_users_table.ts:18`

`phone_number` is `notNullable()` but not `unique()`. Two users can register with the same phone number, which may cause confusion with OTP verification.

---

### 3.10 `lastMonthPrincipal` Can Be Zero or Negative

**File:** `src/loans/loans.service.ts:196-199`

Since `roundUpToNearest500Or1000` always rounds up, `principalPaidInFirstMonths` can exceed the total principal. Example with `principal=1000, tenor=3`: `monthlyPrincipal=333.33`, rounded to 500, first months pay 1000, last month = 0.

---

### 3.11 Missing `ParseUUIDPipe` on All UUID Path Parameters

**Files:** All controllers

UUID params like `:id`, `:userId`, `:savingsId` are accepted as raw strings with no UUID format validation, allowing malformed strings through to database queries.

---

### 3.12 `sortBy` in PaginationQueryDto Allows Arbitrary Strings

**File:** `src/database/dto/pagination.dto.ts:43`

No whitelist validation on `sortBy`. If the value is interpolated into a Knex `orderBy` clause without sanitization, it could enable SQL injection.

---

### 3.13 `ExpenseSource.TOTAL` Case Not Handled

**File:** `src/expenses/expenses.service.ts:92-93`

The `source` parameter type includes `'total'` but there's no `case ExpenseSource.TOTAL` in the switch statement. It falls through to `default`, which allocates entirely to capital without balance checking.

---

### 3.14 `users.service.ts` `update()` Reads Outside Transaction

**File:** `src/users/users.service.ts:210-216`

The `update()` method's `findById` existence check does NOT use the `trx` parameter that was passed to it, so it reads outside the transaction scope, creating a potential TOCTOU race condition.

---

### 3.15 `LoansQueryDto` Reimplements Pagination

**File:** `src/loans/dto/loans-query.dto.ts:13-80`

Defines its own `page`, `limit`, `sortBy`, `sortOrder` instead of extending `PaginationQueryDto`. Code duplication and inconsistency with savings/expenses query DTOs.

---

### 3.16 `@Min(0)` Allows Zero Loan Amount

**File:** `src/loans/dto/create-loan.dto.ts:27`

```ts
@Min(0)
```

Should be `@IsPositive()` or `@Min(1)`. Compare with `CalculateLoanRequestDto` which correctly uses `@IsPositive()` for the same business concept.

---

### 3.17 Floating-Point Financial Calculations in Reports

**File:** `src/reports/reports.service.ts:92,296-297`

```ts
memberData.total += amount
const bunga = installments.total_interest + installments.total_penalty
```

Report totals use JavaScript's native `+` operator instead of `Decimal.js` (which is used in `loans.service.ts` for financial calculations). Rounding errors accumulate across many members.

---

### 3.18 `RejectUserQueryDto.reason` Missing `@IsNotEmpty()`

**File:** `src/users/dto/approve-user.dto.ts:27-28`

The `reason` field is required but lacks `@IsNotEmpty()`. An empty string `""` passes validation. Same issue exists in `src/loans/dto/loan-approval.dto.ts:24`.

---

### 3.19 `cashbook-balance.service.ts` Creates Unnecessary Transactions

**File:** `src/cashbook/cashbook-balance.service.ts:54-73`

```ts
const transaction = trx || (await this.databaseService.getKnex().transaction())
```

When no `trx` is passed, a new transaction is created just to read a single value. If the read throws, the catch block calls `transaction.rollback()`, but if the rollback fails, the transaction leaks. A simple query would suffice for a read operation.

---

### 3.20 Hardcoded Test Database Credentials

**File:** `knexfile.ts:49-56`

```ts
test: {
  client: 'pg',
  connection: {
    database: 'db_lumbung_mesari_test',
    host: 'localhost',
    user: 'admin',
    password: 'admin123',
    port: 5433
  }
}
```

Even for test environments, credentials should come from environment variables.

---

## 4. Unused Code

### 4.1 Unused Service Methods

| Method                      | File                                                  | Notes                                                   |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `findByEmailWithRole()`     | `src/users/users.service.ts:~117`                     | Never called externally; only in test files             |
| `getSavingsConfiguration()` | `src/savings/savings.service.ts:~387`                 | No callers found                                        |
| `getCronSchedule()`         | `src/savings/savings.service.ts:~222`                 | Only called from unused `getSavingsConfiguration()`     |
| `updateIncomeTransaction()` | `src/cashbook/cashbook-transaction.service.ts:192`    | Never called by any service                             |
| `deleteIncomeTransaction()` | `src/cashbook/cashbook-transaction.service.ts:247`    | Never called by any service                             |
| `getRecentTransactions()`   | `src/cashbook/cashbook-transaction.service.ts:269`    | Never called by any service                             |
| `sendBulkEmail()`           | `src/notifications/email/email-helper.service.ts:~70` | Never called; also ignores `Promise.allSettled` results |
| `getAvailableTemplates()`   | `src/notifications/template.service.ts:211`           | Only used in test files                                 |
| `reloadTemplates()`         | `src/notifications/template.service.ts:218`           | Never called                                            |
| `getHello()`                | `src/app.service.ts:~5`                               | NestJS scaffolding; never called                        |

### 4.2 Unused Module Components

| Component                                            | File                                                | Reason                                                                 |
| ---------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `AppController`                                      | `src/app.controller.ts`                             | Has no route handlers; empty controller                                |
| `AppService`                                         | `src/app.service.ts`                                | Only method (`getHello`) never called                                  |
| `MandatorySavingsRepository` in `UsersSavingsModule` | `src/users-savings/users-savings.module.ts:29`      | Registered as provider but never injected by any service in the module |
| `TransactionFilters` interface                       | `src/cashbook/cashbook-transaction.service.ts:7-14` | Defined but never used as a type                                       |
| `IsOptional` import                                  | `src/auth/dto/register.dto.ts:8`                    | Imported but unused                                                    |

### 4.3 Dead Code

| Item                                            | File                                         | Notes                                                              |
| ----------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Commented-out `monthlyPayment` calculation      | `src/loans/loans.service.ts:~187`            | `// const monthlyPayment = monthlyPrincipal.plus(monthlyInterest)` |
| Commented-out `depositImageUrl` in response DTO | `src/users/dto/users-response.dto.ts:~49-55` | Should be removed or tracked as TODO                               |
| `scripts/read-excel.js`                         | `scripts/read-excel.js`                      | Orphaned utility script; not referenced anywhere                   |

---

## 5. Debug Code Left in Production

| File                                    | Line               | Code                                                                                                          | Impact                                                        |
| --------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/reports/reports.service.ts`        | 63                 | `console.log(memberDataMap)`                                                                                  | Dumps all member financial data to stdout on every report     |
| `src/notifications/template.service.ts` | 93-95              | Debug logger with emoji prefixes (`'...... DEBUG: Starting template precompilation...'`)                      | Log noise                                                     |
| `src/notifications/template.service.ts` | 127                | `console.log('...... DEBUG: Error during template precompilation:', error)`                                   | Bypasses structured logging                                   |
| `src/notifications/template.service.ts` | 203-204            | `console.log('Compiled templates', this.compiledTemplates)` and `console.log('Template name:', templateName)` | Fires on **every email send**, dumping all compiled templates |
| `src/auth/auth.controller.ts`           | 106, 224, 270, 320 | `console.error(...)` instead of NestJS Logger                                                                 | Bypasses structured logging and log levels                    |

---

## 6. Architectural Issues

### 6.1 Duplicate Repository Instances Across Modules

**File:** `src/users-savings/users-savings.module.ts:27-31`

`MandatorySavingsRepository`, `PrincipalSavingsRepository`, and `UsersRepository` are registered as providers in `UsersSavingsModule` **and** in their original modules (`SavingsModule`, `UsersModule`). This creates **separate instances** of the same repository classes, which could cause inconsistent state if any repository maintains internal caches.

**Recommendation:** Import the source modules and use their exported providers instead of re-declaring repositories.

---

### 6.2 Inconsistent Guard Application Pattern

| Controller                         | Guard Pattern                                                             |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Users, Savings, Cashbook, Expenses | `JwtAuthGuard` at **class level**                                         |
| Loans                              | `JwtAuthGuard` at **method level** (every endpoint)                       |
| Auth                               | `JwtAuthGuard` at **method level** (correct -- login/register are public) |

The loans controller pattern is error-prone: if a new endpoint is added without explicitly applying `JwtAuthGuard`, it will be unprotected.

---

### 6.3 Inconsistent Error Handling Pattern

| Controller               | Pattern                                                       |
| ------------------------ | ------------------------------------------------------------- |
| Auth                     | `console.error` + `InternalServerErrorException` in try/catch |
| Loans                    | No try/catch at all (raw exceptions propagate)                |
| Users, Savings, Expenses | NestJS `Logger` + structured errors                           |
| Register (Auth)          | No try/catch while other auth endpoints have it               |

---

### 6.4 Three Duplicate `TokenDto` Classes

**Files:** `src/auth/dto/login.dto.ts`, `src/auth/dto/register.dto.ts`, `src/auth/dto/verify-otp.dto.ts`

The same `TokenDto` class is defined three times, causing Swagger schema name collisions (`TokenDto`, `TokenDto1`, `TokenDto2`).

**Recommendation:** Extract a single shared `TokenDto` class.

---

### 6.5 Balance Response Uses Raw Schema Instead of DTO Class

**Files:** `src/cashbook/dto/balance.dto.ts`, `src/auth/dto/profile-response.dto.ts`

These files export plain JSON objects instead of class-based DTOs. Inconsistent with all other response DTOs and prevents proper TypeScript type checking.

---

### 6.6 `incomes.service.ts` Repeated Category Lookups

**File:** `src/incomes/incomes.service.ts`

Every income creation method does `findCategoryByCode()` at runtime. These categories are static seed data and should be cached at startup rather than queried on every transaction.

---

### 6.7 `incomes.service.ts` Transaction Parameter Typed as `any`

**File:** `src/incomes/incomes.service.ts:18,59,101,144,188`

All methods accept `trx?: any` instead of `trx?: Knex.Transaction`. This bypasses TypeScript type checking.

---

### 6.8 Implicit Coupling Between Scheduler Date and Due Dates

**Files:** `src/loans/loans.scheduler.ts:23`, `src/loans/loans.service.ts:593-596`

The loans scheduler fires on the 21st and checks for installments due "yesterday" (the 20th). If installments are actually due on the 21st, they won't be caught until next month. The business logic coupling between scheduler trigger date and due-date convention is implicit and fragile.

---

### 6.9 Savings Scheduler Lacks Idempotency Guard

**File:** `src/savings/savings.scheduler.ts:38-50`

If the server restarts and the yearly job fires twice, or in horizontal scaling, `createYearlyMandatorySavingsForAllUsers()` could attempt to create duplicate records. The `UNIQUE(user_id, period_date)` constraint will cause the second run to fail, but the error is swallowed (only logged), meaning 0 records are created on retry with no alert.

---

## 7. DTO Validation Gaps

| Field                                                 | File                                                              | Missing Validator                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| All UUID path params (`:id`, `:userId`, `:savingsId`) | All controllers                                                   | `ParseUUIDPipe`                                           |
| `loanPeriodId`                                        | `src/loans/dto/create-loan.dto.ts`, `calculate-loan.dto.ts`       | `@IsUUID()`                                               |
| `expenseCategoryId`                                   | `src/expenses/dto/create-expense.dto.ts`, `update-expense.dto.ts` | `@IsUUID()`                                               |
| `loanId`                                              | `src/expenses/dto/create-expense.dto.ts`, `update-expense.dto.ts` | `@IsUUID()`                                               |
| `reason` (reject user)                                | `src/users/dto/approve-user.dto.ts:29`                            | `@IsNotEmpty()`                                           |
| `reason` (reject loan)                                | `src/loans/dto/loan-approval.dto.ts:24`                           | `@IsNotEmpty()`                                           |
| `transactionDate` (update)                            | `src/expenses/dto/update-expense.dto.ts:95`                       | `@IsDate()`                                               |
| `password` (register)                                 | `src/auth/dto/register.dto.ts`                                    | `@MaxLength()`                                            |
| `sortBy` (pagination base)                            | `src/database/dto/pagination.dto.ts:43`                           | `@IsIn()` or `@IsEnum()` whitelist                        |
| `year`, `month` (reports)                             | `src/reports/reports.controller.ts:71,146`                        | No DTO/validation at all                                  |
| `identifier`, `password` default `= ''`               | `src/auth/dto/login.dto.ts:12,21`                                 | Default empty strings mask missing fields                 |
| `UpdateExpenseDto.userId`                             | `src/expenses/dto/update-expense.dto.ts:56`                       | No authorization check; allows arbitrary user attribution |
| Loan status in query                                  | `src/loans/dto/loans-query.dto.ts:42`                             | Uses `@IsEnum` with plain array instead of proper enum    |

---

## 8. Migration & Seed Issues

### 8.1 Migration Issues

| Issue                                                         | File                                                                                       | Severity |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| Hardcoded initial balance (5,000,000 IDR) in migration        | `src/database/migrations/20250908023205_create_cashbook_balances_table.ts:17-21`           | Medium   |
| Redundant index on already-unique `type` column               | `src/database/migrations/20250908023205_create_cashbook_balances_table.ts:12-14`           | Low      |
| Missing timestamps on `roles` table                           | `src/database/migrations/20250531154634_create_roles_table.ts:4-7`                         | Low      |
| Data insertion (notification types) in structural migration   | `src/database/migrations/20250531163446_create_notifications_audit_related_table.ts:62-92` | Low      |
| `dropTable` instead of `dropTableIfExists` in down migrations | Expenses, Incomes, Cashbook transactions, Notifications migrations                         | Medium   |
| Trigger fires unnecessarily on non-status loan updates        | `src/database/migrations/20250908020539_create_constraints_business_rules.ts:30-35`        | Low      |

### 8.2 Seed Issues

| Issue                                                                                  | File                                                                                     | Severity |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Hardcoded weak passwords (`admin123`, `member123`)                                     | `seeds/002_admin_user.ts:5`, `seeds/003_users.ts:5`                                      | Medium   |
| Seeds not idempotent (fail on re-run)                                                  | `seeds/001_roles.ts`, `002_admin_user.ts`, `003_users.ts`, `004_income_categories.ts`    | Medium   |
| Destructive delete before re-insert                                                    | `seeds/006_loan_periods.ts:4` -- deletes all loan periods then re-inserts with new UUIDs | Medium   |
| Only `005_expense_categories.ts` properly checks for existing records before inserting | --                                                                                       | --       |

---

## 9. Priority Recommendation

### Immediate (Critical) -- Fix Before Any Production Deployment

1. **1.1** - Remove hardcoded JWT fallback secret; validate env vars at startup
2. **1.2** - Configure `@nestjs/throttler` with rate limiting on auth endpoints
3. **1.3** - Hash OTP before storage; use `timingSafeEqual` for comparison
4. **1.4 + 1.5** - Fix cashbook transaction update/delete to properly maintain balance snapshots
5. **1.6** - Fix expense update fund availability check
6. **1.7** - Pass transaction to `findPrincipalSavingsByUserId`
7. **1.8** - Add `CHECK (balance >= 0)` constraint on cashbook balances

### High Priority -- Fix Within Current Sprint

8. **2.1** - Configure CORS with explicit origins
9. **2.2** - Conditionally enable Swagger; remove hardcoded credentials
10. **2.3** - Separate refresh token secret; add rotation
11. **2.4** - Add role guard to cashbook balances endpoint
12. **2.5** - Fix inverted `isDevelopment` logic
13. **2.6** - Check user status in JWT strategy validate
14. **2.7** - Change CASCADE to RESTRICT on installments FK
15. **2.8 + Section 5** - Remove all debug `console.log` statements
16. **2.9** - Remove sensitive data from error messages
17. **2.10** - Add user status check for loan creation
18. **2.12** - Add distributed lock for cron jobs

### Medium Priority -- Next Sprint

19. Fix all items in Section 3 (business logic bugs)
20. Fix all DTO validation gaps (Section 7)
21. Fix migration issues (Section 8)

### Low Priority -- Cleanup

22. Remove all unused code (Section 4)
23. Fix architectural inconsistencies (Section 6)
24. Standardize error handling and guard patterns across controllers

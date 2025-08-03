import { UserTable } from './users'
import { RoleTable } from './roles'
import {
  SavingsAccountTable,
  TransactionTable,
  TransactionTypeTable
} from './savings'
import { LoanTable, LoanPeriodTable, InstallmentTable } from './loans'
import {
  AuditLogTable,
  NotificationTable,
  NotificationTypeTable,
  EmailLogTable
} from './audit'

export interface Database {
  // User management
  users: UserTable
  roles: RoleTable

  // Savings management
  savings_accounts: SavingsAccountTable
  transaction_types: TransactionTypeTable
  transactions: TransactionTable

  // Loan management
  loan_periods: LoanPeriodTable
  loans: LoanTable
  installments: InstallmentTable

  // Audit and notifications
  audit_logs: AuditLogTable
  notification_types: NotificationTypeTable
  notifications: NotificationTable
  email_logs: EmailLogTable
}

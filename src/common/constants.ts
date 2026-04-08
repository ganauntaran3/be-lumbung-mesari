export const MILLISECONDS_IN_MINUTE = 60000
export const MILLISECONDS_IN_HOUR = 3600000
export const MAXIMUM_AUTH_REQUESTS_PER_MINUTE = 8
export const MAXIMUM_REQUESTS_PER_MINUTE = 60
export const MAXIMUM_AUTH_REQUESTS_PER_MINUTE_NAME = 'auth'
export const NON_ACTIVE_USER_ACCESS_TOKEN_EXPIRY = '10m'
export const ACTIVE_USER_ACCESS_TOKEN_EXPIRY = '1h'
export const ADVISORY_LOCK_ID_GENERATE_YEARLY_MANDATORY_SAVINGS = 1
export const ADVISORY_LOCK_ID_CHECK_OVERDUE_INSTALLMENTS = 2

export enum UserStatus {
  WAITING_DEPOSIT = 'waiting_deposit',
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REJECTED = 'rejected'
}

export enum IncomeCategoryCode {
  PRINCIPAL_SAVINGS = 'principal_savings',
  MANDATORY_SAVINGS = 'mandatory_savings',
  INSTALLMENT_PRINCIPAL = 'installment_principal',
  LOAN_INTEREST = 'loan_interest',
  LOAN_ADMIN_FEE = 'loan_admin_fee',
  LATE_PAYMENT_PENALTY = 'late_payment_penalty',
  DONATION = 'donation',
  OTHERS = 'others'
}

export enum UserRole {
  SUPERADMIN = 'superadministrator',
  ADMIN = 'administrator',
  MEMBER = 'member'
}

// ERROR MESSAGES
export const generateInsufficientPermissionsMessage = (role: string) =>
  `User with role ${role} does not have sufficient permissions.`

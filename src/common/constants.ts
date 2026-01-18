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

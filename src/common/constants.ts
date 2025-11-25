export enum UserStatus {
  WAITING_DEPOSIT = 'waiting_deposit',
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REJECTED = 'rejected'
}

export enum UserRole {
  SUPERADMIN = 'superadministrator',
  ADMIN = 'administrator',
  MEMBER = 'member'
}

// ERROR MESSAGES
export const generateInsufficientPermissionsMessage = (role: string) =>
  `User with role ${role} does not have sufficient permissions.`

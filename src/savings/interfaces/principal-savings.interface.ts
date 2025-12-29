import { PaginationResult } from '../../interface/pagination'

export interface PrincipalSavingsTable {
  id: string
  user_id: string
  amount: string
  status: 'paid' | 'pending' | 'cancelled'
  processed_by?: string
  paid_at?: Date
  created_at: Date
  updated_at: Date
}

export interface UserInfo {
  id: string
  fullname: string
  email: string
  username: string
}

export interface ProcessedByUser {
  id: string
  fullname: string
}

export interface PrincipalSavingsWithUser {
  id: string
  amount: string
  status: 'paid' | 'pending' | 'cancelled'
  processed_by?: string
  paid_at?: Date
  created_at: Date
  updated_at: Date
  user: UserInfo
  processed_by_user?: ProcessedByUser
}

// Export types
export type PrincipalSavings = PrincipalSavingsTable
export type UpdatePrincipalSavings = Partial<
  Pick<PrincipalSavingsTable, 'status' | 'processed_by' | 'paid_at'>
>

export type PrincipalSavingsPaginatedResponse =
  PaginationResult<PrincipalSavingsWithUser>

import { PaginationResult } from '../../interface/pagination'

export interface MandatorySavingsTable {
  id: string
  user_id: string
  period_date: Date
  amount: string
  status: 'due' | 'paid' | 'overdue'
  paid_at?: Date
  created_at: Date
  updated_at: Date
  processed_by?: string
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

export interface MandatorySavingsWithUser {
  id: string
  period_date: Date
  amount: string
  status: 'due' | 'paid' | 'overdue'
  paid_at?: Date
  created_at: Date
  updated_at: Date
  processed_by?: string
  user: UserInfo
  processed_by_user?: ProcessedByUser
}

// Export types
export type MandatorySavings = MandatorySavingsTable
export type UpdateMandatorySavings = Partial<
  Pick<MandatorySavingsTable, 'status' | 'paid_at' | 'processed_by'>
>

export type MandatorySavingsPaginatedResponse =
  PaginationResult<MandatorySavingsWithUser>

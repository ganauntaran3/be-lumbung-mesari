import { ExpenseTable, ExpenseCategoryTable } from '../../interface/expenses'
import { PaginationResult } from '../../interface/pagination'

// Extended interfaces for API responses
export interface ExpenseWithCategory extends ExpenseTable {
  category: ExpenseCategoryTable
}

// Interface for expense filtering
export interface ExpenseFilters {
  category?: string
  userId?: string
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  sortBy?: 'date' | 'amount' | 'category'
  sortOrder?: 'asc' | 'desc'
}

// Response interfaces for API
export interface ExpenseResponse {
  id: string
  expenseCategoryId: string
  amount: number
  userId?: string
  loanId?: string
  notes?: string
  source?: 'auto' | 'total' | 'capital' | 'shu'
  createdAt: Date
  updatedAt: Date
  category: {
    id: string
    code: string
    name: string
    description?: string
    defaultSource: 'auto' | 'total' | 'capital' | 'shu'
  }
}

export interface ExpensesPaginatedResponse
  extends PaginationResult<ExpenseResponse> {}

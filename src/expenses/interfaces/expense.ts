import { ExpenseSource } from '../../cashbook/interfaces/transaction.interface'
import { PaginationResult } from '../../interface/pagination'

export interface ExpenseCategoryTable {
  id: string
  code: string
  name: string
  description?: string
  default_source: ExpenseSource
  created_at: Date
  updated_at: Date
}

export interface ExpenseTable {
  id: string
  expense_category_id: string
  name: string
  shu_amount: string
  capital_amount: string
  created_by: string
  loan_id?: string
  notes?: string
  source?: ExpenseSource
  txn_date: Date
  created_at: Date
  updated_at: Date
}

// Type aliases for CRUD operations
export type ExpenseCategory = ExpenseCategoryTable
export type NewExpenseCategory = Omit<
  ExpenseCategoryTable,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateExpenseCategory = Partial<
  Omit<ExpenseCategoryTable, 'id' | 'created_at' | 'updated_at'>
>

export type Expense = ExpenseTable
export type NewExpense = Omit<ExpenseTable, 'id' | 'created_at' | 'updated_at'>
export type UpdateExpense = Partial<
  Omit<ExpenseTable, 'id' | 'created_at' | 'updated_at'>
>

// Extended interfaces for API responses
export interface ExpenseWithCategoryTable extends ExpenseTable {
  created_by_fullname: string
  category: ExpenseCategory
}

export interface ExpenseTransformResponse {
  id: string
  name: string
  expenseCategoryId: string
  shuAmount: number
  capitalAmount: number
  createdBy: string
  loanId?: string
  notes?: string
  source?: ExpenseSource
  createdAt: Date
  updatedAt: Date
  category: {
    id: string
    code: string
    name: string
    description?: string
    defaultSource?: ExpenseSource
  }
}

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
  name: string
  shuAmount: number
  capitalAmount: number
  totalAmount: number
  createdBy: {
    id: string
    fullname: string
  }
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
    defaultSource?: ExpenseSource
  }
}

export interface ExpensesPaginatedResponse
  extends PaginationResult<ExpenseResponse> {}

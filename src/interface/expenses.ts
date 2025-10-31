export interface ExpenseCategoryTable {
  id: string
  code: string
  name: string
  description?: string
  default_source: 'auto' | 'total' | 'capital' | 'shu'
  created_at: Date
  updated_at: Date
}

export interface ExpenseTable {
  id: string
  expense_category_id: string
  amount: string
  user_id?: string
  loan_id?: string
  notes?: string
  source?: 'auto' | 'total' | 'capital' | 'shu'
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
export interface ExpenseWithCategory extends ExpenseTable {
  category: ExpenseCategory
}

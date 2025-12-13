export interface IncomeCategoryTable {
  id: string
  code: string
  name: string
  description?: string
  created_at: Date
  updated_at: Date
}

export interface IncomeTable {
  id: string
  name: string
  income_category_id: string
  amount: number
  user_id?: string
  loan_id?: string
  principal_saving_id?: string
  mandatory_saving_id?: string
  txn_date?: Date
  notes?: string
  created_at?: Date
  updated_at?: Date
}

export interface IncomeWithCategory {
  id: string
  amount: string
  user_id?: string
  loan_id?: string
  notes?: string
  created_at: Date
  category: {
    id: string
    code: string
    name: string
    description?: string
  }
}

export type Income = IncomeTable
export type IncomeCategory = IncomeCategoryTable

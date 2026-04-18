export enum ExpenseSource {
  AUTO = 'auto',
  CAPITAL = 'capital',
  SHU = 'shu'
}

export enum IncomeDestination {
  SHU = 'shu',
  CAPITAL = 'capital'
}

export interface CashbookTransactionTable {
  id: string
  txn_date: Date
  direction: 'in' | 'out'
  shu_amount: number
  capital_amount: number
  // Balance snapshots for audit trail
  shu_balance_before: number
  shu_balance_after: number
  capital_balance_before: number
  capital_balance_after: number
  total_balance_before: number
  total_balance_after: number
  income_id?: string | null
  expense_id?: string | null
  user_id?: string
  is_reversal: boolean
  reversal_of?: string | null
  deleted_at?: Date | null
  created_at: Date
  updated_at: Date
}

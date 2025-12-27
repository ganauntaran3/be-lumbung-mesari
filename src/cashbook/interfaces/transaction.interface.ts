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
  income_id?: string
  expense_id?: string
  user_id?: string
  created_at: Date
  updated_at: Date
}

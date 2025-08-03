export interface SavingsAccountTable {
  id: string
  user_id: string
  account_number: string
  balance: string
  interest_rate: string
  status: string
  created_at?: Date
  updated_at?: Date
}

export interface TransactionTypeTable {
  id: string
  name: string
  description: string | null
  created_at?: Date
  updated_at?: Date
}

export interface TransactionTable {
  id: string
  user_id: string
  savings_account_id: string
  transaction_type_id: string
  amount: string
  balance_before: string
  balance_after: string
  description: string | null
  reference_number: string
  status: string
  processed_at: Date | null
  created_at?: Date
  updated_at?: Date
}

// Export types
export type SavingsAccount = SavingsAccountTable
export type NewSavingsAccount = Omit<
  SavingsAccountTable,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateSavingsAccount = Partial<
  Omit<SavingsAccountTable, 'id' | 'created_at' | 'updated_at'>
>

export type TransactionType = TransactionTypeTable
export type NewTransactionType = Omit<
  TransactionTypeTable,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateTransactionType = Partial<
  Omit<TransactionTypeTable, 'id' | 'created_at' | 'updated_at'>
>

export type Transaction = TransactionTable
export type NewTransaction = Omit<
  TransactionTable,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateTransaction = Partial<
  Omit<TransactionTable, 'id' | 'created_at' | 'updated_at'>
>

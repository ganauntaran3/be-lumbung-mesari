import { Selectable, Insertable, Updateable, Generated } from 'kysely'

export interface SavingsAccountTable {
  id: Generated<string>
  user_id: string
  account_number: string
  balance: string
  interest_rate: string
  status: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TransactionTypeTable {
  id: Generated<string>
  name: string
  description: string | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TransactionTable {
  id: Generated<string>
  savings_account_id: string
  transaction_type_id: string
  amount: string
  description: string | null
  reference_number: string
  status: string
  payment_method: string | null
  payment_details: unknown | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export type SavingsAccount = Selectable<SavingsAccountTable>
export type NewSavingsAccount = Insertable<SavingsAccountTable>
export type UpdateSavingsAccount = Updateable<SavingsAccountTable>

export type TransactionType = Selectable<TransactionTypeTable>
export type NewTransactionType = Insertable<TransactionTypeTable>
export type UpdateTransactionType = Updateable<TransactionTypeTable>

export type Transaction = Selectable<TransactionTable>
export type NewTransaction = Insertable<TransactionTable>
export type UpdateTransaction = Updateable<TransactionTable>

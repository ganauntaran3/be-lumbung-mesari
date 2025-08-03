import { Selectable, Insertable, Updateable, Generated } from 'kysely'

export interface LoanPeriodTable {
  id: Generated<string>
  months: number
  interest_rate: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface LoanTable {
  id: Generated<string>
  user_id: string
  loan_number: string
  amount: string
  loan_period_id: string
  interest_rate: string
  total_amount: string
  monthly_payment: string
  start_date: Date | null
  end_date: Date | null
  purpose: string
  status: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface InstallmentTable {
  id: Generated<string>
  loan_id: string
  installment_number: number
  due_date: Date
  amount: string
  principal_amount: string
  interest_amount: string
  penalty_amount: string
  paid_amount: string
  paid_date: Date | null
  status: string
  payment_transaction_id: string | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export type LoanPeriod = Selectable<LoanPeriodTable>
export type NewLoanPeriod = Insertable<LoanPeriodTable>
export type UpdateLoanPeriod = Updateable<LoanPeriodTable>

export type Loan = Selectable<LoanTable>
export type NewLoan = Insertable<LoanTable>
export type UpdateLoan = Updateable<LoanTable>

export type Installment = Selectable<InstallmentTable>
export type NewInstallment = Insertable<InstallmentTable>
export type UpdateInstallment = Updateable<InstallmentTable>

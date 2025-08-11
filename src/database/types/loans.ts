export interface LoanPeriodTable {
  id: string
  months: number
  interest_rate: string
  created_at?: Date
  updated_at?: Date
}

export interface LoanTable {
  id: string
  user_id: string
  loan_number: string
  amount: string
  loan_period_id: string
  interest_rate: string
  total_amount: string
  monthly_payment: string
  start_date: Date | null
  end_date: Date | null
  status: string
  approved_by: string | null
  approved_at: Date | null
  created_at?: Date
  updated_at?: Date
}

export interface InstallmentTable {
  id: string
  loan_id: string
  installment_number: number
  amount: string
  due_date: Date
  paid_date: Date | null
  paid_amount: string | null
  late_fee: string | null
  status: string
  created_at?: Date
  updated_at?: Date
}

// Export types
export type LoanPeriod = LoanPeriodTable
export type NewLoanPeriod = Omit<
  LoanPeriodTable,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateLoanPeriod = Partial<
  Omit<LoanPeriodTable, 'id' | 'created_at' | 'updated_at'>
>

export type Loan = LoanTable
export type NewLoan = Omit<LoanTable, 'id' | 'created_at' | 'updated_at'>
export type UpdateLoan = Partial<
  Omit<LoanTable, 'id' | 'created_at' | 'updated_at'>
>

export type Installment = InstallmentTable
export type NewInstallment = Omit<
  InstallmentTable,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateInstallment = Partial<
  Omit<InstallmentTable, 'id' | 'created_at' | 'updated_at'>
>

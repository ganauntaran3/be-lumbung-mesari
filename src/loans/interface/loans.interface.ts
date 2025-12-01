export interface Loan {
  id: string
  user_id: string
  loan_period_id: string
  principal_amount: string
  admin_fee_amount: string
  disbursed_amount: string
  interest_amount: string
  monthly_payment: string
  last_month_payment: string
  total_payable_amount: string
  installment_late_amount: number | null
  start_date: Date
  end_date: Date
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed'
  approved_by: string | null
  approved_at: Date | null
  disbursed_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface LoanPeriodTable {
  id: string
  tenor: number
  interest_rate: string
}

export interface LoanPeriodResponse {
  id: string
  tenor: number
  interest_rate: string
}

export interface LoanWithUser extends Loan {
  user_fullname: string
  user_email: string
  tenor: number
  interest_rate: string
}

export interface CreateLoanData {
  user_id: string
  loan_period_id: string
  principal_amount: number
  admin_fee_amount: number
  disbursed_amount: number
  interest_amount: number
  monthly_payment: number
  last_month_payment: number
  total_payable_amount: number
  start_date: Date
  end_date: Date
  status: 'pending'
  notes: string | null
}

export interface Installment {
  id: string
  loan_id: string
  installment_number: number
  due_date: Date
  principal_amount: string
  interest_amount: string
  penalty_amount: string
  total_amount: string
  paid_date: Date | null
  paid_amount: string | null
  status: 'due' | 'paid' | 'overdue' | 'partial'
  processed_by: string
  created_at: Date
  updated_at: Date
}

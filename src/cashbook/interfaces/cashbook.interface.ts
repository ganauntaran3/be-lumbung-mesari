export interface CashbookTransactionTable {
    id: string
    txn_date: Date
    direction: 'in' | 'out'
    amount: string
    income_id?: string
    expense_id?: string
    user_id?: string
    created_at: Date
}

export interface CashbookBalanceTable {
    id: string
    type: string
    balance: string
    updated_at: Date
}

export type CashbookTransaction = CashbookTransactionTable
export type CashbookBalance = CashbookBalanceTable

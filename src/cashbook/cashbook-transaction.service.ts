import { Injectable, Logger } from '@nestjs/common'
import { CashbookTransactionRepository } from './cashbook-transaction.repository'
import { CashbookTransactionTable } from './interfaces/cashbook.interface'

export interface TransactionFilters {
    dateFrom?: Date
    dateTo?: Date
    type?: 'income' | 'expense'
    userId?: string
    limit?: number
    offset?: number
}

export interface TransactionSummary {
    totalIncome: number
    totalExpense: number
    netFlow: number
    transactionCount: number
}

@Injectable()
export class CashbookTransactionService {
    private readonly logger = new Logger(CashbookTransactionService.name)

    constructor(private readonly transactionRepository: CashbookTransactionRepository) { }

    /**
     * Create cashbook transaction for income
     * Called when income is recorded and needs to update cashbook
     */
    async createIncomeTransaction(
        incomeId: string,
        userId: string,
        amount: number,
        txnDate?: Date,
        trx?: any
    ): Promise<CashbookTransactionTable> {
        try {
            this.logger.log(`Creating income transaction: ${incomeId}, amount: ${amount}`)

            const transaction = await this.transactionRepository.createTransaction({
                txn_date: txnDate || new Date(),
                direction: 'in',
                amount: amount.toString(),
                income_id: incomeId,
                user_id: userId
            }, trx)

            this.logger.log(`Income transaction created: ${transaction.id}`)
            return transaction
        } catch (error) {
            this.logger.error(`Failed to create income transaction for ${incomeId}:`, error)
            throw error
        }
    }

    /**
     * Create cashbook transaction for expense
     * Called when expense is recorded and needs to update cashbook
     */
    async createExpenseTransaction(
        expenseId: string,
        userId: string,
        amount: number,
        txnDate?: Date
    ): Promise<CashbookTransactionTable> {
        try {
            this.logger.log(`Creating expense transaction: ${expenseId}, amount: ${amount}`)

            const transaction = await this.transactionRepository.createTransaction({
                txn_date: txnDate || new Date(),
                direction: 'out',
                amount: amount.toString(),
                expense_id: expenseId,
                user_id: userId
            })

            this.logger.log(`Expense transaction created: ${transaction.id}`)
            return transaction
        } catch (error) {
            this.logger.error(`Failed to create expense transaction for ${expenseId}:`, error)
            throw error
        }
    }

    /**
     * Get transaction history with filters
     */
    async getTransactionHistory(filters: TransactionFilters = {}): Promise<{
        transactions: CashbookTransactionTable[]
        summary: TransactionSummary
    }> {
        try {
            this.logger.log(`Retrieving transaction history with filters:`, JSON.stringify(filters))

            const transactions = await this.transactionRepository.getTransactionsWithFilters(filters)

            // Calculate summary
            const summary = this.calculateTransactionSummary(transactions)

            this.logger.log(`Retrieved ${transactions.length} transactions`)

            return {
                transactions,
                summary
            }
        } catch (error) {
            this.logger.error('Failed to get transaction history:', error)
            throw error
        }
    }

    /**
     * Get transactions by date range
     */
    async getTransactionsByDateRange(
        from: Date,
        to: Date,
        limit?: number
    ): Promise<CashbookTransactionTable[]> {
        try {
            this.logger.log(`Getting transactions from ${from.toISOString()} to ${to.toISOString()}`)

            const transactions = await this.transactionRepository.getTransactionsWithFilters({
                dateFrom: from,
                dateTo: to,
                limit
            })

            return transactions
        } catch (error) {
            this.logger.error('Failed to get transactions by date range:', error)
            throw error
        }
    }

    /**
     * Get recent transactions
     */
    async getRecentTransactions(limit: number = 10): Promise<CashbookTransactionTable[]> {
        try {
            this.logger.log(`Getting ${limit} recent transactions`)

            const transactions = await this.transactionRepository.getTransactionsWithFilters({
                limit
            })

            return transactions
        } catch (error) {
            this.logger.error('Failed to get recent transactions:', error)
            throw error
        }
    }

    /**
     * Get monthly transaction summary
     */
    async getMonthlyTransactionSummary(
        year: number,
        month: number
    ): Promise<TransactionSummary> {
        try {
            const startDate = new Date(year, month - 1, 1)
            const endDate = new Date(year, month, 0, 23, 59, 59)

            this.logger.log(`Getting monthly summary for ${year}-${month.toString().padStart(2, '0')}`)

            const transactions = await this.getTransactionsByDateRange(startDate, endDate)
            const summary = this.calculateTransactionSummary(transactions)

            return summary
        } catch (error) {
            this.logger.error(`Failed to get monthly summary for ${year}-${month}:`, error)
            throw error
        }
    }

    /**
     * Calculate transaction summary from transaction list
     */
    private calculateTransactionSummary(transactions: CashbookTransactionTable[]): TransactionSummary {
        const summary = transactions.reduce(
            (acc, txn) => {
                const amount = parseFloat(txn.amount)

                if (txn.direction === 'in') {
                    acc.totalIncome += amount
                } else {
                    acc.totalExpense += amount
                }

                acc.transactionCount++
                return acc
            },
            {
                totalIncome: 0,
                totalExpense: 0,
                netFlow: 0,
                transactionCount: 0
            }
        )

        summary.netFlow = summary.totalIncome - summary.totalExpense

        return summary
    }
}
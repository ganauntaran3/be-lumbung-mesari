import { Injectable, Logger } from '@nestjs/common'
import { Knex } from 'knex'

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

  constructor(
    private readonly transactionRepository: CashbookTransactionRepository
  ) {}

  /**
   * Create cashbook transaction for income
   * Called when income is recorded and needs to update cashbook
   */
  async createIncomeTransaction(
    incomeId: string,
    amount: number,
    destination: 'shu' | 'capital',
    trx?: any
  ): Promise<CashbookTransactionTable> {
    try {
      this.logger.log(
        `Creating income transaction: ${incomeId}, amount: ${amount}, destination: ${destination}`
      )

      const transaction = await this.transactionRepository.createTransaction(
        {
          txn_date: new Date(),
          direction: 'in',
          shu_amount: destination === 'shu' ? amount : 0,
          capital_amount: destination === 'capital' ? amount : 0,
          income_id: incomeId
        },
        trx
      )

      this.logger.log(`Income transaction created: ${transaction.id}`)
      return transaction
    } catch (error) {
      this.logger.error(
        `Failed to create income transaction for ${incomeId}:`,
        error
      )
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
    shuAmount: number,
    capitalAmount: number,
    txnDate?: Date,
    trx?: Knex.Transaction
  ): Promise<CashbookTransactionTable> {
    try {
      const totalAmount = shuAmount + capitalAmount
      this.logger.log(
        `Creating expense transaction: ${expenseId}, shu: ${shuAmount}, capital: ${capitalAmount}, total: ${totalAmount}`
      )

      const transaction = await this.transactionRepository.createTransaction(
        {
          txn_date: txnDate || new Date(),
          direction: 'out',
          shu_amount: shuAmount,
          capital_amount: capitalAmount,
          expense_id: expenseId,
          user_id: userId
        },
        trx
      )

      this.logger.log(`Expense transaction created: ${transaction.id}`)
      return transaction
    } catch (error) {
      this.logger.error(
        `Failed to create expense transaction for ${expenseId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Update cashbook transaction for expense
   * Called when expense is updated
   */
  async updateExpenseTransaction(
    expenseId: string,
    shuAmount: number,
    capitalAmount: number,
    txnDate?: Date,
    trx?: Knex.Transaction
  ): Promise<void> {
    try {
      const totalAmount = shuAmount + capitalAmount
      this.logger.log(
        `Updating expense transaction for ${expenseId}: shu: ${shuAmount}, capital: ${capitalAmount}, total: ${totalAmount}`
      )

      await this.transactionRepository.updateTransactionByExpenseId(
        expenseId,
        {
          shu_amount: shuAmount,
          capital_amount: capitalAmount,
          txn_date: txnDate,
          updated_at: new Date()
        },
        trx
      )

      this.logger.log(`Expense transaction updated for ${expenseId}`)
    } catch (error) {
      this.logger.error(
        `Failed to update expense transaction for ${expenseId}:`,
        error
      )
      throw error
    }
  }

  async updateIncomeTransaction(
    incomeId: string,
    amount: number,
    destination: 'shu' | 'capital',
    txnDate?: Date,
    trx?: Knex.Transaction
  ): Promise<void> {
    try {
      this.logger.log(
        `Updating income transaction for ${incomeId}: amount: ${amount}, destination: ${destination}`
      )

      await this.transactionRepository.updateTransactionByIncomeId(
        incomeId,
        {
          shu_amount: destination === 'shu' ? amount : 0,
          capital_amount: destination === 'capital' ? amount : 0,
          txn_date: txnDate,
          updated_at: new Date()
        },
        trx
      )

      this.logger.log(`Income transaction updated for ${incomeId}`)
    } catch (error) {
      this.logger.error(
        `Failed to update income transaction for ${incomeId}:`,
        error
      )
      throw error
    }
  }

  async deleteExpenseTransaction(
    expenseId: string,
    trx?: Knex.Transaction
  ): Promise<void> {
    try {
      this.logger.log(`Deleting expense transaction for ${expenseId}`)

      await this.transactionRepository.deleteTransactionByExpenseId(
        expenseId,
        trx
      )

      this.logger.log(`Expense transaction deleted for ${expenseId}`)
    } catch (error) {
      this.logger.error(
        `Failed to delete expense transaction for ${expenseId}:`,
        error
      )
      throw error
    }
  }

  async deleteIncomeTransaction(
    incomeId: string,
    trx?: Knex.Transaction
  ): Promise<void> {
    try {
      this.logger.log(`Deleting income transaction for ${incomeId}`)

      await this.transactionRepository.deleteTransactionByIncomeId(
        incomeId,
        trx
      )

      this.logger.log(`Income transaction deleted for ${incomeId}`)
    } catch (error) {
      this.logger.error(
        `Failed to delete income transaction for ${incomeId}:`,
        error
      )
      throw error
    }
  }

  async getRecentTransactions(
    limit: number = 10
  ): Promise<CashbookTransactionTable[]> {
    try {
      this.logger.log(`Getting ${limit} recent transactions`)

      const transactions =
        await this.transactionRepository.getTransactionsWithFilters({
          limit
        })

      return transactions
    } catch (error) {
      this.logger.error('Failed to get recent transactions:', error)
      throw error
    }
  }
}

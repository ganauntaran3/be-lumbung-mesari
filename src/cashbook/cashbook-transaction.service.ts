import { Injectable, Logger } from '@nestjs/common'

import { Knex } from 'knex'

import { CashbookTransactionRepository } from './cashbook-transaction.repository'
import { CashbookTransactionTable } from './interfaces/transaction.interface'

export interface TransactionFilters {
  dateFrom?: Date
  dateTo?: Date
  type?: 'income' | 'expense'
  userId?: string
  limit?: number
  offset?: number
}

@Injectable()
export class CashbookTransactionService {
  private readonly logger = new Logger(CashbookTransactionService.name)

  constructor(
    private readonly transactionRepository: CashbookTransactionRepository
  ) {}

  async createIncomeTransaction(
    incomeId: string,
    amount: number,
    destination: 'shu' | 'capital',
    trx: Knex.Transaction,
    txnDate?: Date
  ): Promise<CashbookTransactionTable> {
    try {
      this.logger.log(
        `Creating income transaction: ${incomeId}, amount: ${amount}, destination: ${destination}`
      )

      // Lock and read current balances
      const balances = await trx('cashbook_balances')
        .select('type', 'balance')
        .whereIn('type', ['shu', 'capital', 'total'])
        .forUpdate()

      const shuBefore = parseFloat(
        balances.find((b: any) => b.type === 'shu')?.balance || '0'
      )
      const capitalBefore = parseFloat(
        balances.find((b: any) => b.type === 'capital')?.balance || '0'
      )
      const totalBefore = parseFloat(
        balances.find((b: any) => b.type === 'total')?.balance || '0'
      )

      // Calculate expected balances after transaction
      const shuAmount = destination === 'shu' ? amount : 0
      const capitalAmount = destination === 'capital' ? amount : 0
      const shuAfter = shuBefore + shuAmount
      const capitalAfter = capitalBefore + capitalAmount
      const totalAfter = totalBefore + amount

      const transaction = await this.transactionRepository.createTransaction(
        {
          txn_date: txnDate || new Date(),
          direction: 'in',
          shu_amount: shuAmount,
          capital_amount: capitalAmount,
          shu_balance_before: shuBefore,
          shu_balance_after: shuAfter,
          capital_balance_before: capitalBefore,
          capital_balance_after: capitalAfter,
          total_balance_before: totalBefore,
          total_balance_after: totalAfter,
          income_id: incomeId
        },
        trx
      )

      this.logger.log(
        `Income transaction created: ${transaction.id} (Total: ${totalBefore} -> ${totalAfter})`
      )
      return transaction
    } catch (error) {
      this.logger.error(
        `Failed to create income transaction for ${incomeId}:`,
        error
      )
      throw error
    }
  }

  async createExpenseTransaction(
    expenseId: string,
    userId: string,
    shuAmount: number,
    capitalAmount: number,
    trx: Knex.Transaction,
    txnDate?: Date
  ): Promise<CashbookTransactionTable> {
    try {
      const totalAmount = shuAmount + capitalAmount
      this.logger.log(
        `Creating expense transaction: ${expenseId}, shu: ${shuAmount}, capital: ${capitalAmount}, total: ${totalAmount}`
      )

      // Lock and read current balances
      const balances = await trx('cashbook_balances')
        .select('type', 'balance')
        .whereIn('type', ['shu', 'capital', 'total'])
        .forUpdate()

      const shuBefore = parseFloat(
        balances.find((b: any) => b.type === 'shu')?.balance || '0'
      )
      const capitalBefore = parseFloat(
        balances.find((b: any) => b.type === 'capital')?.balance || '0'
      )
      const totalBefore = parseFloat(
        balances.find((b: any) => b.type === 'total')?.balance || '0'
      )

      // Calculate expected balances after transaction
      const shuAfter = shuBefore - shuAmount
      const capitalAfter = capitalBefore - capitalAmount
      const totalAfter = totalBefore - totalAmount

      const transaction = await this.transactionRepository.createTransaction(
        {
          txn_date: txnDate || new Date(),
          direction: 'out',
          shu_amount: shuAmount,
          capital_amount: capitalAmount,
          shu_balance_before: shuBefore,
          shu_balance_after: shuAfter,
          capital_balance_before: capitalBefore,
          capital_balance_after: capitalAfter,
          total_balance_before: totalBefore,
          total_balance_after: totalAfter,
          expense_id: expenseId,
          user_id: userId
        },
        trx
      )

      this.logger.log(
        `Expense transaction created: ${transaction.id} (Total: ${totalBefore} -> ${totalAfter})`
      )
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

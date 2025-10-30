import { Injectable, Logger } from '@nestjs/common'
import { Knex } from 'knex'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'

import { CashbookTransactionTable } from './interfaces/cashbook.interface'

export interface TransactionFilters {
  dateFrom?: Date
  dateTo?: Date
  type?: 'income' | 'expense'
  userId?: string
  incomeId?: string
  expenseId?: string
  limit?: number
  offset?: number
}

@Injectable()
export class CashbookTransactionRepository extends BaseRepository<CashbookTransactionTable> {
  private readonly logger = new Logger(CashbookTransactionRepository.name)

  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService, 'cashbook_transactions')
  }

  async createTransaction(
    data: Omit<CashbookTransactionTable, 'id' | 'created_at'>,
    trx?: Knex.Transaction
  ): Promise<CashbookTransactionTable> {
    try {
      this.logger.debug(
        `Creating cashbook transaction: ${data.direction} ${data.amount}`
      )

      const query = trx
        ? trx('cashbook_transactions')
        : this.knex('cashbook_transactions')
      const [result] = await query
        .insert({
          ...data,
          created_at: new Date()
        })
        .returning('*')

      this.logger.log(
        `Cashbook transaction created: ${result.id} (${data.direction} ${data.amount})`
      )
      return result as CashbookTransactionTable
    } catch (error) {
      this.logger.error('Failed to create cashbook transaction:', error)
      throw error
    }
  }

  async getTransactionsWithFilters(
    filters: TransactionFilters = {}
  ): Promise<CashbookTransactionTable[]> {
    try {
      this.logger.debug(
        'Getting transactions with filters:',
        JSON.stringify(filters)
      )

      let query = this.knex('cashbook_transactions').orderBy(
        'created_at',
        'desc'
      )

      // Apply date filters
      if (filters.dateFrom) {
        query = query.where('txn_date', '>=', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.where('txn_date', '<=', filters.dateTo)
      }

      // Apply type filter (income/expense)
      if (filters.type) {
        const direction = filters.type === 'income' ? 'in' : 'out'
        query = query.where('direction', direction)
      }

      // Apply user filter
      if (filters.userId) {
        query = query.where('user_id', filters.userId)
      }

      // Apply income/expense ID filters
      if (filters.incomeId) {
        query = query.where('income_id', filters.incomeId)
      }

      if (filters.expenseId) {
        query = query.where('expense_id', filters.expenseId)
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.offset(filters.offset)
      }

      const results = await query

      this.logger.debug(`Retrieved ${results.length} transactions`)

      return results as CashbookTransactionTable[]
    } catch (error) {
      this.logger.error('Failed to get transactions with filters:', error)
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
      return await this.getTransactionsWithFilters({
        dateFrom: from,
        dateTo: to,
        limit
      })
    } catch (error) {
      this.logger.error('Failed to get transactions by date range:', error)
      throw error
    }
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(
    limit: number = 10
  ): Promise<CashbookTransactionTable[]> {
    try {
      return await this.getTransactionsWithFilters({ limit })
    } catch (error) {
      this.logger.error('Failed to get recent transactions:', error)
      throw error
    }
  }

  /**
   * Get transactions by user
   */
  async getTransactionsByUser(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<CashbookTransactionTable[]> {
    try {
      return await this.getTransactionsWithFilters({
        userId,
        limit,
        offset
      })
    } catch (error) {
      this.logger.error(`Failed to get transactions for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Get transactions for specific income record
   */
  async getTransactionsByIncome(
    incomeId: string
  ): Promise<CashbookTransactionTable[]> {
    try {
      return await this.getTransactionsWithFilters({ incomeId })
    } catch (error) {
      this.logger.error(
        `Failed to get transactions for income ${incomeId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Get transactions for specific expense record
   */
  async getTransactionsByExpense(
    expenseId: string
  ): Promise<CashbookTransactionTable[]> {
    try {
      return await this.getTransactionsWithFilters({ expenseId })
    } catch (error) {
      this.logger.error(
        `Failed to get transactions for expense ${expenseId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Get transaction count with filters
   */
  async getTransactionCount(
    filters: Omit<TransactionFilters, 'limit' | 'offset'> = {}
  ): Promise<number> {
    try {
      let query = this.knex('cashbook_transactions')

      // Apply same filters as getTransactionsWithFilters but without pagination
      if (filters.dateFrom) {
        query = query.where('txn_date', '>=', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.where('txn_date', '<=', filters.dateTo)
      }

      if (filters.type) {
        const direction = filters.type === 'income' ? 'in' : 'out'
        query = query.where('direction', direction)
      }

      if (filters.userId) {
        query = query.where('user_id', filters.userId)
      }

      if (filters.incomeId) {
        query = query.where('income_id', filters.incomeId)
      }

      if (filters.expenseId) {
        query = query.where('expense_id', filters.expenseId)
      }

      const [{ count }] = await query.count('id as count')

      return parseInt(count as string, 10)
    } catch (error) {
      this.logger.error('Failed to get transaction count:', error)
      throw error
    }
  }

  /**
   * Get transaction summary (total income, expense, net flow)
   */
  async getTransactionSummary(
    filters: Omit<TransactionFilters, 'limit' | 'offset'> = {}
  ): Promise<{
    totalIncome: number
    totalExpense: number
    netFlow: number
    transactionCount: number
  }> {
    try {
      const transactions = await this.getTransactionsWithFilters(filters)

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
    } catch (error) {
      this.logger.error('Failed to get transaction summary:', error)
      throw error
    }
  }
}

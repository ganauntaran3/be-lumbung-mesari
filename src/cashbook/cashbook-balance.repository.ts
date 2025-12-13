import { Injectable, Logger } from '@nestjs/common'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'

import { CashbookBalanceTable } from './interfaces/cashbook.interface'

@Injectable()
export class CashbookBalanceRepository extends BaseRepository<CashbookBalanceTable> {
  private readonly logger = new Logger(CashbookBalanceRepository.name)

  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService, 'cashbook_balances')
  }

  /**
   * Get current balance for specific type
   */
  async getBalance(balanceType: 'total' | 'capital' | 'shu'): Promise<number> {
    try {
      const result = await this.knex('cashbook_balances')
        .where('type', balanceType)
        .select('balance')
        .first()

      const balance = result ? parseFloat(result.balance) : 0
      this.logger.debug(`Retrieved ${balanceType} balance: ${balance}`)

      return balance
    } catch (error) {
      this.logger.error(`Failed to get ${balanceType} balance:`, error)
      throw error
    }
  }

  /**
   * Get all balances as key-value object
   */
  async getAllBalances(): Promise<Record<string, number>> {
    try {
      const results = await this.knex('cashbook_balances').select(
        'type',
        'balance',
        'updated_at'
      )

      const balances = results.reduce(
        (acc, row) => {
          acc[row.type] = parseFloat(row.balance)
          return acc
        },
        {} as Record<string, number>
      )

      this.logger.debug('Retrieved all balances:', balances)

      return balances
    } catch (error) {
      this.logger.error('Failed to get all balances:', error)
      throw error
    }
  }

  /**
   * Get balance with last updated timestamp
   */
  async getBalanceWithTimestamp(
    balanceType: 'total' | 'capital' | 'shu'
  ): Promise<{
    balance: number
    updatedAt: Date
  }> {
    try {
      const result = await this.knex('cashbook_balances')
        .where('type', balanceType)
        .select('balance', 'updated_at')
        .first()

      if (!result) {
        return { balance: 0, updatedAt: new Date() }
      }

      return {
        balance: parseFloat(result.balance),
        updatedAt: result.updated_at
      }
    } catch (error) {
      this.logger.error(
        `Failed to get ${balanceType} balance with timestamp:`,
        error
      )
      throw error
    }
  }

  /**
   * Get all balances with their timestamps
   */
  async getAllBalancesWithTimestamps(): Promise<CashbookBalanceTable[]> {
    try {
      const results = await this.knex('cashbook_balances')
        .select('*')
        .orderBy('type')

      return results as CashbookBalanceTable[]
    } catch (error) {
      this.logger.error('Failed to get all balances with timestamps:', error)
      throw error
    }
  }

  /**
   * Check if balance type exists
   */
  async balanceTypeExists(balanceType: string): Promise<boolean> {
    try {
      const result = await this.knex('cashbook_balances')
        .where('type', balanceType)
        .select('id')
        .first()

      return !!result
    } catch (error) {
      this.logger.error(
        `Failed to check if balance type ${balanceType} exists:`,
        error
      )
      return false
    }
  }

  /**
   * Initialize balance type if it doesn't exist
   * Useful for adding new balance types in the future
   */
  async initializeBalanceType(
    balanceType: string,
    initialBalance: number = 0
  ): Promise<CashbookBalanceTable> {
    try {
      const exists = await this.balanceTypeExists(balanceType)

      if (exists) {
        this.logger.warn(`Balance type ${balanceType} already exists`)
        return (await this.knex('cashbook_balances')
          .where('type', balanceType)
          .first()) as CashbookBalanceTable
      }

      const [result] = await this.knex('cashbook_balances')
        .insert({
          type: balanceType,
          balance: initialBalance,
          updated_at: new Date()
        })
        .returning('*')

      this.logger.log(
        `Initialized new balance type: ${balanceType} with balance: ${initialBalance}`
      )

      return result as CashbookBalanceTable
    } catch (error) {
      this.logger.error(
        `Failed to initialize balance type ${balanceType}:`,
        error
      )
      throw error
    }
  }
}

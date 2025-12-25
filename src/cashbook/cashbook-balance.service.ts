import { Injectable, Logger } from '@nestjs/common'

import { Knex } from 'knex'

import { DatabaseService } from '../database/database.service'

import { CashbookBalanceRepository } from './cashbook-balance.repository'

export interface CashbookBalances {
  total: number
  capital: number
  shu: number
  updatedAt: Date
}

export interface BalanceHistory {
  date: Date
  total: number
  capital: number
  shu: number
}

@Injectable()
export class CashbookBalanceService {
  private readonly logger = new Logger(CashbookBalanceService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly balanceRepository: CashbookBalanceRepository
  ) {}

  async getCurrentBalances(): Promise<CashbookBalances> {
    try {
      this.logger.log('Retrieving current cashbook balances')

      const balances = await this.balanceRepository.getAllBalances()

      return {
        total: balances.total || 0,
        capital: balances.capital || 0,
        shu: balances.shu || 0,
        updatedAt: new Date() // Could get from actual balance records
      }
    } catch (error) {
      this.logger.error('Failed to get current balances:', error)
      throw error
    }
  }

  async getBalanceByType(
    type: 'total' | 'capital' | 'shu',
    trx?: Knex.Transaction
  ): Promise<number> {
    const transaction =
      trx || (await this.databaseService.getKnex().transaction())
    try {
      this.logger.debug(`Retrieving ${type} balance`)

      const balance = await this.balanceRepository.getBalance(type, transaction)

      if (!trx) {
        await transaction.commit()
      }

      this.logger.debug(`${type} balance: ${balance}`)
      return balance
    } catch (error) {
      if (!trx) {
        await transaction.rollback()
      }
      this.logger.error(`Failed to get ${type} balance:`, error)
      throw error
    }
  }
}

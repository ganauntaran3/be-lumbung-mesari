import { Injectable, Logger } from '@nestjs/common'

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

  constructor(private readonly balanceRepository: CashbookBalanceRepository) {}

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

  async getBalanceByType(type: 'total' | 'capital' | 'shu'): Promise<number> {
    try {
      this.logger.debug(`Retrieving ${type} balance`)

      const balance = await this.balanceRepository.getBalance(type)

      this.logger.debug(`${type} balance: ${balance}`)
      return balance
    } catch (error) {
      this.logger.error(`Failed to get ${type} balance:`, error)
      throw error
    }
  }

  async validateSufficientBalance(
    type: 'capital' | 'shu',
    amount: number
  ): Promise<boolean> {
    try {
      const currentBalance = await this.getBalanceByType(type)
      const hasSufficientBalance = currentBalance >= amount

      this.logger.debug(
        `Balance validation - ${type}: ${currentBalance}, required: ${amount}, sufficient: ${hasSufficientBalance}`
      )

      return hasSufficientBalance
    } catch (error) {
      this.logger.error(`Failed to validate ${type} balance:`, error)
      return false
    }
  }
}

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

    constructor(private readonly balanceRepository: CashbookBalanceRepository) { }

    /**
     * Get current balances for all types (total, capital, shu)
     */
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

    /**
     * Get balance for specific type
     */
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

    /**
     * Validate if sufficient balance exists for a transaction
     */
    async validateSufficientBalance(type: 'capital' | 'shu', amount: number): Promise<boolean> {
        try {
            const currentBalance = await this.getBalanceByType(type)
            const hasSufficientBalance = currentBalance >= amount

            this.logger.debug(`Balance validation - ${type}: ${currentBalance}, required: ${amount}, sufficient: ${hasSufficientBalance}`)

            return hasSufficientBalance
        } catch (error) {
            this.logger.error(`Failed to validate ${type} balance:`, error)
            return false
        }
    }

    /**
     * Get balance summary with breakdown
     */
    async getBalanceSummary(): Promise<{
        balances: CashbookBalances
        breakdown: {
            availableForShu: number
            availableForOperations: number
            totalLiquidity: number
        }
    }> {
        try {
            const balances = await this.getCurrentBalances()

            return {
                balances,
                breakdown: {
                    availableForShu: balances.shu,
                    availableForOperations: balances.capital + balances.shu,
                    totalLiquidity: balances.total
                }
            }
        } catch (error) {
            this.logger.error('Failed to get balance summary:', error)
            throw error
        }
    }

    /**
     * Check if SHU distribution is possible
     */
    async canDistributeShu(amount: number): Promise<{
        canDistribute: boolean
        availableAmount: number
        shortfall?: number
    }> {
        try {
            const shuBalance = await this.getBalanceByType('shu')
            const canDistribute = shuBalance >= amount

            const result = {
                canDistribute,
                availableAmount: shuBalance,
                ...(canDistribute ? {} : { shortfall: amount - shuBalance })
            }

            this.logger.log(`SHU distribution check - Amount: ${amount}, Available: ${shuBalance}, Can distribute: ${canDistribute}`)

            return result
        } catch (error) {
            this.logger.error('Failed to check SHU distribution possibility:', error)
            throw error
        }
    }
}
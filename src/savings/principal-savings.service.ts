import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SavingsRepository } from './savings.repository'
import { PrincipalSavingsWithUser } from './interfaces/principal-savings.interface'
import { UsersSavingsService } from '../users-savings/users-savings.service'
import { IncomesService } from '../incomes/incomes.service'
import { CashbookTransactionService } from '../cashbook/cashbook-transaction.service'

@Injectable()
export class PrincipalSavingsService {
    private readonly logger = new Logger(PrincipalSavingsService.name)

    constructor(
        private readonly savingsRepository: SavingsRepository,
        private readonly usersSavingsService: UsersSavingsService,
        private readonly incomesService: IncomesService,
        private readonly cashbookTransactionService: CashbookTransactionService,
        private readonly configService: ConfigService
    ) { }

    /**
     * Create principal savings record for a new user
     * Called after OTP verification
     * Amount is calculated dynamically: total_balance / active_member_count
     */
    async createPrincipalSavings(userId: string): Promise<PrincipalSavingsWithUser> {
        try {
            // Calculate principal savings amount dynamically
            const principalAmount = await this.calculatePrincipalSavingsAmount()

            this.logger.log(`Creating principal savings for user ${userId} with calculated amount ${principalAmount}`)

            const principalSavings = await this.savingsRepository.createPrincipalSavings({
                user_id: userId,
                amount: principalAmount.toString(),
                status: 'pending'
            })

            this.logger.log(`Principal savings created successfully for user ${userId} with amount ${principalAmount}`)

            // Fetch with user info
            return await this.savingsRepository.findPrincipalSavingsByIdWithUser(principalSavings.id)
        } catch (error) {
            this.logger.error(`Failed to create principal savings for user ${userId}:`, error)
            throw error
        }
    }

    /**
     * Get principal savings for a specific user
     */
    async getUserPrincipalSavings(userId: string): Promise<PrincipalSavingsWithUser | null> {
        try {
            this.logger.log(`Retrieving principal savings for user ${userId}`)

            const principalSavings = await this.savingsRepository.findPrincipalSavingsByUserId(userId)

            if (!principalSavings) {
                this.logger.log(`No principal savings found for user ${userId}`)
                return null
            }

            return principalSavings
        } catch (error) {
            this.logger.error(`Failed to retrieve principal savings for user ${userId}:`, error)
            throw error
        }
    }

    /**
     * Approve principal savings (mark as paid)
     * Called by admin when verifying deposit proof
     * 
     * This will:
     * 1. Mark principal savings as 'paid'
     * 2. Create income record (category: principal_savings)
     * 3. Create cashbook transaction (direction: 'in')
     * 4. Trigger will automatically update cashbook_balances
     */
    async approvePrincipalSavings(
        userId: string,
        processedBy: string
    ): Promise<PrincipalSavingsWithUser> {
        try {
            this.logger.log(`Approving principal savings for user ${userId} by admin ${processedBy}`)

            const principalSavings = await this.savingsRepository.findPrincipalSavingsByUserId(userId)

            if (!principalSavings) {
                throw new NotFoundException(`Principal savings not found for user ${userId}`)
            }

            if (principalSavings.status === 'paid') {
                throw new BadRequestException('Principal savings already approved')
            }

            // Step 1: Mark principal savings as paid
            const updated = await this.savingsRepository.updatePrincipalSavings(principalSavings.id, {
                status: 'paid',
                processed_by: processedBy,
                processed_at: new Date()
            })

            this.logger.log(`Principal savings marked as paid for user ${userId}`)

            // Step 2: Create income record
            const amount = parseFloat(principalSavings.amount)
            const income = await this.incomesService.createPrincipalSavingsIncome(
                userId,
                amount,
                `Simpanan pokok dari ${principalSavings.user.fullname}`
            )

            this.logger.log(`Income created for principal savings: ${income.id}`)

            // Step 3: Create cashbook transaction (trigger will update balance)
            await this.cashbookTransactionService.createIncomeTransaction(
                income.id,
                userId,
                amount
            )

            this.logger.log(`Cashbook transaction created. Principal savings approval complete for user ${userId}`)

            return await this.savingsRepository.findPrincipalSavingsByIdWithUser(updated.id)
        } catch (error) {
            this.logger.error(`Failed to approve principal savings for user ${userId}:`, error)
            throw error
        }
    }

    /**
     * Calculate principal savings amount dynamically
     * Formula: total_balance / active_member_count
     * 
     * Example: 5,000,000 / 20 members = 250,000 per member
     */
    private async calculatePrincipalSavingsAmount(): Promise<number> {
        try {
            // Get total balance from cashbook_balances
            const totalBalance = await this.savingsRepository.getCashbookBalance()

            // Get count of active members (excluding admins)
            const activeMemberCount = await this.usersSavingsService.getActiveMemberCount()

            // If no active members yet, use minimum amount from config
            if (activeMemberCount === 0) {
                const minAmount = this.getMinimumPrincipalSavingsAmount()
                this.logger.warn(`No active members found. Using minimum amount: ${minAmount}`)
                return minAmount
            }

            // Calculate principal savings amount
            const principalAmount = Math.floor(totalBalance / activeMemberCount)

            // Ensure minimum amount
            const minAmount = this.getMinimumPrincipalSavingsAmount()
            if (principalAmount < minAmount) {
                this.logger.warn(`Calculated amount ${principalAmount} is below minimum ${minAmount}. Using minimum.`)
                return minAmount
            }

            this.logger.log(`Calculated principal savings: ${totalBalance} / ${activeMemberCount} = ${principalAmount}`)

            return principalAmount
        } catch (error) {
            this.logger.error('Failed to calculate principal savings amount:', error)
            // Fallback to minimum amount
            const minAmount = this.getMinimumPrincipalSavingsAmount()
            this.logger.warn(`Using fallback minimum amount: ${minAmount}`)
            return minAmount
        }
    }

    /**
     * Get minimum principal savings amount from config
     */
    private getMinimumPrincipalSavingsAmount(): number {
        const amount = this.configService.get<number>('PRINCIPAL_SAVINGS_MIN_AMOUNT', 50000)

        if (amount <= 0) {
            this.logger.warn(`Invalid minimum principal savings amount configured: ${amount}. Using default: 50000`)
            return 50000
        }

        return amount
    }
}

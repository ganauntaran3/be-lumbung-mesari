import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Knex } from 'knex'

import { CashbookTransactionService } from '../cashbook/cashbook-transaction.service'
import { IncomesService } from '../incomes/incomes.service'
import { SavingsRepository } from '../savings/savings.repository'
import { UsersRepository } from '../users/users.repository'

/**
 * UsersSavingsService
 *
 * Bridge service that handles cross-domain operations between users and savings.
 * This service eliminates circular dependencies between UsersModule and SavingsModule.
 *
 * Responsibilities:
 * - Approve principal savings when admin approves user
 * - Create principal savings after OTP verification
 * - Provide user query methods for savings operations
 * - Coordinate income and cashbook transaction creation
 */
@Injectable()
export class UsersSavingsService {
  private readonly logger = new Logger(UsersSavingsService.name)

  constructor(
    private readonly savingsRepository: SavingsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly incomesService: IncomesService,
    private readonly cashbookTransactionService: CashbookTransactionService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Approve principal savings when admin approves user
   * Called from UsersService.approveUser()
   *
   * @param userId - ID of the user whose principal savings to approve
   * @param processedBy - ID of the admin who approved
   * @param trx - Database transaction to ensure consistency
   */
  async approvePrincipalSavingsForUser(
    userId: string,
    processedBy: string,
    trx: Knex.Transaction
  ): Promise<void> {
    this.logger.log(`Approving principal savings for user ${userId}`)

    // 1. Find principal savings
    const principalSavings =
      await this.savingsRepository.findPrincipalSavingsByUserId(userId)

    if (!principalSavings) {
      throw new NotFoundException('Principal savings not found')
    }

    if (principalSavings.status === 'paid') {
      throw new BadRequestException('Principal savings already approved')
    }

    // 2. Mark as paid
    await this.savingsRepository.updatePrincipalSavings(
      principalSavings.id,
      {
        status: 'paid',
        processed_by: processedBy,
        processed_at: new Date()
      },
      trx
    )

    // 3. Create income
    const amount = parseFloat(principalSavings.amount)
    const income = await this.incomesService.createPrincipalSavingsIncome(
      userId,
      amount,
      `Simpanan pokok dari ${principalSavings.user.fullname}`,
      trx
    )

    // 4. Create cashbook transaction
    await this.cashbookTransactionService.createIncomeTransaction(
      income.id,
      userId,
      amount,
      undefined,
      trx
    )

    this.logger.log(`Principal savings approved for user ${userId}`)
  }

  /**
   * Create principal savings after OTP verification
   * Called from AuthService.verifyOtp()
   *
   * @param userId - ID of the user to create principal savings for
   * @param trx - Optional transaction object. If provided, operations will use this transaction
   */
  async createPrincipalSavings(
    userId: string,
    trx?: Knex.Transaction
  ): Promise<void> {
    this.logger.log(`Creating principal savings for user ${userId}`)

    // 1. Calculate amount
    const amount = await this.calculatePrincipalSavingsAmount(trx)

    // 2. Create principal savings
    await this.savingsRepository.createPrincipalSavings(
      {
        user_id: userId,
        amount: amount.toString(),
        status: 'pending'
      },
      trx
    )

    this.logger.log(
      `Principal savings created for user ${userId} with amount ${amount}`
    )
  }

  /**
   * Get count of active members
   * Called from PrincipalSavingsService
   *
   * @returns Number of active members
   */
  async getActiveMemberCount(): Promise<number> {
    this.logger.debug('Getting active member count')
    const count = await this.usersRepository.getActiveMemberCount()
    this.logger.debug(`Active member count: ${count}`)
    return count
  }

  /**
   * Get IDs of active members
   * Called from MandatorySavingsService
   *
   * @returns Array of active member IDs
   */
  async getActiveMemberIds(): Promise<string[]> {
    this.logger.debug('Getting active member IDs')
    const ids = await this.usersRepository.getActiveMemberIds()
    this.logger.debug(`Found ${ids.length} active members`)
    return ids
  }

  /**
   * Calculate principal savings amount
   * Formula: total_balance / active_member_count
   *
   * @param trx - Optional transaction object
   * @returns Calculated principal savings amount
   */
  private async calculatePrincipalSavingsAmount(
    trx?: Knex.Transaction
  ): Promise<number> {
    const totalBalance = await this.savingsRepository.getCashbookBalance(trx)
    const activeMemberCount =
      await this.usersRepository.getActiveMemberCount(trx)

    if (activeMemberCount === 0) {
      return this.getMinimumAmount()
    }

    const amount = Math.floor(totalBalance / activeMemberCount)
    const minAmount = this.getMinimumAmount()

    return Math.max(amount, minAmount)
  }

  /**
   * Get minimum principal savings amount from configuration
   *
   * @returns Minimum amount (default: 50000)
   */
  private getMinimumAmount(): number {
    return this.configService.get<number>('PRINCIPAL_SAVINGS_MIN_AMOUNT', 50000)
  }
}

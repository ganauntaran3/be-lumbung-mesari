import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Knex } from 'knex'
import { IncomeDestination } from 'src/cashbook/interfaces/cashbook.interface'

import { CashbookTransactionService } from '../cashbook/cashbook-transaction.service'
import { IncomesService } from '../incomes/incomes.service'
import { SavingsRepository } from '../savings/savings.repository'
import { UsersRepository } from '../users/users.repository'
import { CashbookBalanceService } from 'src/cashbook/cashbook-balance.service'

/**
 * UsersSavingsService
 *
 * Bridge service that handles cross-domain operations between users and savings.
 * This service eliminates circular dependencies between UsersModule and SavingsModule.
 */
@Injectable()
export class UsersSavingsService {
  private readonly logger = new Logger(UsersSavingsService.name)

  constructor(
    private readonly savingsRepository: SavingsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly incomesService: IncomesService,
    private readonly cashbookTransactionService: CashbookTransactionService,
    private readonly cashbookBalanceService: CashbookBalanceService,
    private readonly configService: ConfigService
  ) {}

  async settlePrincipalSavings(
    userId: string,
    adminId: string,
    trx?: Knex.Transaction
  ): Promise<void> {
    this.logger.log(`Settling principal savings for user ${userId}`)

    // 1. Find principal savings
    const principalSavings =
      await this.savingsRepository.findPrincipalSavingsByUserId(userId)

    if (!principalSavings) {
      throw new NotFoundException(
        `No principal savings for user with id ${userId}`
      )
    }

    if (principalSavings.status === 'paid') {
      throw new BadRequestException('Principal savings already approved')
    }

    // 2. Mark as paid
    await this.savingsRepository.updatePrincipalSavings(
      principalSavings.id,
      {
        status: 'paid',
        processed_by: adminId,
        processed_at: new Date()
      },
      trx
    )

    // 3. Create income
    const amount = parseFloat(principalSavings.amount)
    const income = await this.incomesService.createPrincipalSavingsIncome(
      userId,
      principalSavings.id,
      amount,
      `Simpanan pokok dari ${principalSavings.user.fullname}`,
      trx
    )

    // 4. Create cashbook transaction
    await this.cashbookTransactionService.createIncomeTransaction(
      income.id,
      amount,
      IncomeDestination.CAPITAL,
      trx
    )

    this.logger.log(`Principal savings approved for user ${userId}`)
  }

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

  async getActiveMemberIds(): Promise<string[]> {
    this.logger.debug('Getting active member IDs')
    const ids = await this.usersRepository.getActiveMemberIds()
    this.logger.debug(`Found ${ids.length} active members`)
    return ids
  }

  private async calculatePrincipalSavingsAmount(
    trx?: Knex.Transaction
  ): Promise<number> {
    const totalBalance =
      await this.cashbookBalanceService.getBalanceByType('total')
    const activeMemberCount =
      await this.usersRepository.getActiveMemberCount(trx)

    if (activeMemberCount === 0) {
      return this.getMinimumAmount()
    }

    const amount = Math.floor(totalBalance / activeMemberCount)
    const minAmount = this.getMinimumAmount()

    return Math.max(amount, minAmount)
  }

  private getMinimumAmount(): number {
    return this.configService.get<number>('PRINCIPAL_SAVINGS_MIN_AMOUNT', 50000)
  }
}

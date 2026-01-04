import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { Knex } from 'knex'

import { CashbookBalanceService } from '../cashbook/cashbook-balance.service'
import { CashbookTransactionService } from '../cashbook/cashbook-transaction.service'
import { IncomeDestination } from '../cashbook/interfaces/transaction.interface'
import { IncomesService } from '../incomes/incomes.service'
import { PrincipalSavingsRepository } from '../savings/principal-savings.repository'
import { UsersRepository } from '../users/users.repository'

@Injectable()
export class UsersSavingsService {
  private readonly logger = new Logger(UsersSavingsService.name)

  constructor(
    private readonly principalSavingsRepository: PrincipalSavingsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly incomesService: IncomesService,
    private readonly cashbookTransactionService: CashbookTransactionService,
    private readonly cashbookBalanceService: CashbookBalanceService,
    private readonly configService: ConfigService
  ) {}

  async settlePrincipalSavings(
    userId: string,
    adminId: string,
    trx: Knex.Transaction
  ): Promise<void> {
    this.logger.log(`Settling principal savings for user ${userId}`)

    // 1. Find principal savings
    const principalSavings =
      await this.principalSavingsRepository.findPrincipalSavingsByUserId(userId)

    if (!principalSavings) {
      throw new NotFoundException(
        `No principal savings for user with id ${userId}`
      )
    }

    if (principalSavings.status === 'paid') {
      throw new BadRequestException('Principal savings already approved')
    }

    // 2. Mark as paid
    await this.principalSavingsRepository.updatePrincipalSavings(
      principalSavings.id,
      {
        status: 'paid',
        processed_by: adminId,
        paid_at: new Date()
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
    await this.principalSavingsRepository.createPrincipalSavings(
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
    const totalBalance = await this.cashbookBalanceService.getBalanceByType(
      'total',
      trx
    )
    const activeMemberCount =
      await this.usersRepository.getActiveMemberCount(trx)

    if (activeMemberCount === 0) {
      return this.getMinimumAmount()
    }

    const amount = Math.floor(totalBalance / activeMemberCount)

    return amount
  }

  private getMinimumAmount(): number {
    return this.configService.get<number>('PRINCIPAL_SAVINGS_MIN_AMOUNT', 50000)
  }
}

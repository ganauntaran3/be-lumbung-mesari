import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { CashbookTransactionService } from '../cashbook/cashbook-transaction.service'
import { IncomeDestination } from '../cashbook/interfaces/transaction.interface'
import { DatabaseService } from '../database/database.service'
import { IncomesService } from '../incomes/incomes.service'
import { UsersSavingsService } from '../users-savings/users-savings.service'

import { SavingsQueryDto } from './dto/savings-query.dto'
import { MandatorySavingsPaginatedResponse } from './interfaces/mandatory-savings.interface'
import { SavingsRepository } from './savings.repository'

@Injectable()
export class MandatorySavingsService {
  private readonly logger = new Logger(MandatorySavingsService.name)

  constructor(
    private readonly savingsRepository: SavingsRepository,
    private readonly usersSavingsService: UsersSavingsService,
    private readonly configService: ConfigService,
    private readonly incomesService: IncomesService,
    private readonly cashbookTransactionService: CashbookTransactionService,
    private readonly databaseService: DatabaseService
  ) {}

  async findAllMandatorySavings(
    queryParams: SavingsQueryDto
  ): Promise<MandatorySavingsPaginatedResponse> {
    try {
      this.logger.log(
        'Retrieving mandatory savings with parameters:',
        JSON.stringify(queryParams)
      )

      if (queryParams.period) {
        this.validatePeriodParameter(queryParams.period)
      }

      const processedParams = this.applyDefaultDateRange(queryParams)

      const result =
        await this.savingsRepository.findAllWithUsers(processedParams)

      this.logger.log(
        `Retrieved ${result.data.length} mandatory savings records out of ${result.totalData} total`
      )

      return result
    } catch (error) {
      this.logger.error('Failed to retrieve mandatory savings:', error)

      if (error instanceof BadRequestException) {
        throw error
      }

      throw new InternalServerErrorException(
        'Failed to retrieve mandatory savings records'
      )
    }
  }

  async findUserMandatorySavings(
    userId: string,
    queryParams: SavingsQueryDto
  ): Promise<MandatorySavingsPaginatedResponse> {
    try {
      this.logger.log(
        `Retrieving mandatory savings for user ${userId} with parameters:`,
        JSON.stringify(queryParams)
      )

      if (queryParams.period) {
        this.validatePeriodParameter(queryParams.period)
      }
      const processedParams = this.applyDefaultDateRange(queryParams)

      const result = await this.savingsRepository.findByUserIdWithPagination(
        userId,
        processedParams
      )

      this.logger.log(
        `Retrieved ${result.data.length} mandatory savings records for user ${userId} out of ${result.totalData} total`
      )

      return result
    } catch (error) {
      this.logger.error(
        `Failed to retrieve mandatory savings for user ${userId}:`,
        error
      )

      if (error instanceof BadRequestException) {
        throw error
      }

      throw new InternalServerErrorException(
        'Failed to retrieve user mandatory savings records'
      )
    }
  }

  async createYearlyMandatorySavingsForAllUsers(): Promise<void> {
    this.logger.log(
      'Starting yearly mandatory savings creation for all active members (12 months)'
    )

    try {
      const activeMemberIds =
        await this.usersSavingsService.getActiveMemberIds()

      this.logger.log(`Found ${activeMemberIds.length} active members`)

      if (activeMemberIds.length === 0) {
        this.logger.warn(
          'No active members found for mandatory savings creation'
        )
        return
      }

      const mandatorySavingsAmount = this.getMandatorySavingsAmount()
      this.logger.log(
        `Using mandatory savings amount: ${mandatorySavingsAmount}`
      )

      const createdCount =
        await this.savingsRepository.createYearlyMandatorySavingsForUsers(
          activeMemberIds,
          mandatorySavingsAmount
        )

      this.logger.log(
        `Successfully processed ${createdCount} mandatory savings records (12 months) for ${activeMemberIds.length} active members`
      )
    } catch (error) {
      this.logger.error('Failed to create yearly mandatory savings:', error)
      throw new InternalServerErrorException(
        'Failed to create yearly mandatory savings records'
      )
    }
  }

  /**
   * Get the configured mandatory savings amount with validation
   */
  private getMandatorySavingsAmount(): number {
    const amount = this.configService.get<number>(
      'MANDATORY_SAVINGS_DEFAULT_AMOUNT',
      500000
    )

    if (amount <= 0) {
      this.logger.warn(
        `Invalid mandatory savings amount configured: ${amount}. Using default: 500000`
      )
      return 500000
    }

    return amount
  }

  private validatePeriodParameter(period: string): void {
    const validMonths = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ]

    if (!validMonths.includes(period.toLowerCase())) {
      throw new BadRequestException(
        `Invalid period parameter: ${period}. Must be a valid month name in English (e.g., january, february, etc.)`
      )
    }
  }

  private applyDefaultDateRange(queryParams: SavingsQueryDto): SavingsQueryDto {
    if (queryParams.period) {
      return queryParams
    }

    const defaultDateRangeDays = this.getDefaultDateRangeDays()

    this.logger.debug(
      `Applying default date range of ${defaultDateRangeDays} days`
    )

    return queryParams
  }

  private getDefaultDateRangeDays(): number {
    const days = this.configService.get<number>(
      'SAVINGS_DEFAULT_DATE_RANGE_DAYS',
      30
    )

    if (days <= 0 || days > 365) {
      this.logger.warn(
        `Invalid default date range configured: ${days}. Using default: 30`
      )
      return 30
    }

    return days
  }

  getCronSchedule(): string {
    const schedule = this.configService.get<string>(
      'MANDATORY_SAVINGS_CRON_SCHEDULE',
      '0 0 1 * *'
    )
    this.logger.debug(`Mandatory savings cron schedule: ${schedule}`)
    return schedule
  }

  async generateRemainingYearSavings(): Promise<{
    message: string
    months_generated: number
    users_count: number
    total_records: number
    months: string[]
  }> {
    this.logger.log(
      'Generating mandatory savings for remaining months of current year'
    )

    try {
      const activeMemberIds =
        await this.usersSavingsService.getActiveMemberIds()

      this.logger.log(`Found ${activeMemberIds.length} active members`)

      if (activeMemberIds.length === 0) {
        this.logger.warn('No active members found')
        return {
          message: 'No active members found to generate savings for',
          months_generated: 0,
          users_count: 0,
          total_records: 0,
          months: []
        }
      }

      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() // 0-11
      const currentYear = currentDate.getFullYear()
      const remainingMonths = 12 - currentMonth // From current month to December

      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ]

      const generatedMonths: string[] = []
      for (let i = currentMonth; i < 12; i++) {
        generatedMonths.push(monthNames[i])
      }

      this.logger.log(
        `Generating savings for ${remainingMonths} months: ${generatedMonths.join(', ')}`
      )

      const mandatorySavingsAmount = this.getMandatorySavingsAmount()
      this.logger.log(
        `Using mandatory savings amount: ${mandatorySavingsAmount}`
      )

      const createdCount =
        await this.savingsRepository.generateRemainingYearSavings(
          activeMemberIds,
          mandatorySavingsAmount,
          currentYear,
          currentMonth
        )

      const message = `Successfully generated mandatory savings for ${remainingMonths} months (${generatedMonths.join(', ')}) for ${activeMemberIds.length} active members`

      this.logger.log(message)

      return {
        message,
        months_generated: remainingMonths,
        users_count: activeMemberIds.length,
        total_records: createdCount,
        months: generatedMonths
      }
    } catch (error) {
      this.logger.error('Failed to generate remaining year savings:', error)
      throw new InternalServerErrorException(
        'Failed to generate mandatory savings records'
      )
    }
  }

  async settleMandatorySavings(
    savingsId: string,
    adminId: string
  ): Promise<void> {
    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      this.logger.log(`Starting settlement for mandatory savings ${savingsId}`)

      const mandatorySavings =
        await this.savingsRepository.findMandatorySavingsById(savingsId)

      if (!mandatorySavings) {
        throw new NotFoundException('Mandatory savings not found')
      }

      if (mandatorySavings.status === 'paid') {
        throw new BadRequestException('Mandatory savings already paid')
      }

      // Mark as paid
      await this.savingsRepository.updateMandatorySavings(
        mandatorySavings.id,
        {
          status: 'paid',
          paid_at: new Date(),
          processed_by: adminId
        },
        trx
      )

      // 3. Create income
      const amount = parseFloat(mandatorySavings.amount)
      const periodDate = new Date(mandatorySavings.period_date)
      const monthName = periodDate.toLocaleString('id-ID', { month: 'long' })
      const year = periodDate.getFullYear()

      const income = await this.incomesService.createMandatorySavingsIncome(
        adminId,
        mandatorySavings.id,
        amount,
        `Simpanan wajib ${monthName} ${year}`,
        trx
      )

      // 4. Create cashbook transaction
      await this.cashbookTransactionService.createIncomeTransaction(
        income.id,
        amount,
        IncomeDestination.CAPITAL,
        trx
      )

      this.logger.log(
        `Mandatory savings ${savingsId} settled successfully for user `
      )
      await trx.commit()
    } catch (error) {
      this.logger.error(
        `Failed to settle mandatory savings ${savingsId}:`,
        error
      )
      await trx.rollback()
      throw error
    }
  }

  getSavingsConfiguration(): Record<string, any> {
    return {
      mandatorySavingsAmount: this.getMandatorySavingsAmount(),
      defaultDateRangeDays: this.getDefaultDateRangeDays(),
      cronSchedule: this.getCronSchedule()
    }
  }
}

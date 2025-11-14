import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { CashbookTransactionService } from '../cashbook/cashbook-transaction.service'
import { IncomesService } from '../incomes/incomes.service'
import { UsersSavingsService } from '../users-savings/users-savings.service'

import { PrincipalSavingsWithUser } from './interfaces/principal-savings.interface'
import { SavingsRepository } from './savings.repository'

@Injectable()
export class PrincipalSavingsService {
  private readonly logger = new Logger(PrincipalSavingsService.name)

  constructor(
    private readonly savingsRepository: SavingsRepository,
    private readonly usersSavingsService: UsersSavingsService,
    private readonly incomesService: IncomesService,
    private readonly cashbookTransactionService: CashbookTransactionService,
    private readonly configService: ConfigService
  ) {}

  async getAll(userId: string): Promise<PrincipalSavingsWithUser | null> {
    try {
      this.logger.log(`Retrieving principal savings for user ${userId}`)

      const principalSavings =
        await this.savingsRepository.findPrincipalSavingsByUserId(userId)

      if (!principalSavings) {
        this.logger.log(`No principal savings found for user ${userId}`)
        return null
      }

      return principalSavings
    } catch (error) {
      this.logger.error(
        `Failed to retrieve principal savings for user ${userId}:`,
        error
      )
      throw error
    }
  }
}

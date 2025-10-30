import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { CashbookModule } from '../cashbook/cashbook.module'
import { DatabaseModule } from '../database/database.module'
import { IncomesModule } from '../incomes/incomes.module'
import { SavingsRepository } from '../savings/savings.repository'
import { UsersRepository } from '../users/users.repository'

import { UsersSavingsService } from './users-savings.service'

/**
 * UsersSavingsModule
 *
 * Shared module that bridges Users and Savings domains.
 * This module eliminates circular dependencies by providing
 * shared services that both modules can import.
 *
 * Module Dependency Graph:
 * UsersModule → UsersSavingsModule
 * SavingsModule → UsersSavingsModule
 * UsersSavingsModule → DatabaseModule, IncomesModule, CashbookModule
 */
@Module({
  imports: [DatabaseModule, IncomesModule, CashbookModule, ConfigModule],
  providers: [UsersSavingsService, SavingsRepository, UsersRepository],
  exports: [UsersSavingsService]
})
export class UsersSavingsModule {}

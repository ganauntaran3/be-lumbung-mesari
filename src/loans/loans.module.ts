import { Module } from '@nestjs/common'

import { CashbookModule } from '../cashbook/cashbook.module'
import { DatabaseModule } from '../database/database.module'
import { IncomesModule } from '../incomes/incomes.module'

import { LoansController } from './loans.controller'
import { LoansRepository } from './loans.repository'
import { LoansScheduler } from './loans.scheduler'
import { LoansService } from './loans.service'

@Module({
  imports: [DatabaseModule, IncomesModule, CashbookModule],
  controllers: [LoansController],
  providers: [LoansService, LoansRepository, LoansScheduler],
  exports: [LoansService]
})
export class LoansModule {}

import { Module } from '@nestjs/common'

import { DatabaseModule } from '../database/database.module'

import { CashbookBalanceRepository } from './cashbook-balance.repository'
import { CashbookBalanceService } from './cashbook-balance.service'
import { CashbookTransactionRepository } from './cashbook-transaction.repository'
import { CashbookTransactionService } from './cashbook-transaction.service'
import { CashbookController } from './cashbook.controller'

@Module({
  imports: [DatabaseModule],
  controllers: [CashbookController],
  providers: [
    CashbookBalanceService,
    CashbookTransactionService,
    CashbookBalanceRepository,
    CashbookTransactionRepository
  ],
  exports: [CashbookBalanceService, CashbookTransactionService]
})
export class CashbookModule {}

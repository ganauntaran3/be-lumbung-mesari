import { Module } from '@nestjs/common'
import { CashbookController } from './cashbook.controller'
import { CashbookBalanceService } from './cashbook-balance.service'
import { CashbookTransactionService } from './cashbook-transaction.service'
import { CashbookBalanceRepository } from './cashbook-balance.repository'
import { CashbookTransactionRepository } from './cashbook-transaction.repository'
import { DatabaseModule } from '../database/database.module'

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
export class CashbookModule { }

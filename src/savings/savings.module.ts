import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { CashbookModule } from '../cashbook/cashbook.module'
import { DatabaseModule } from '../database/database.module'
import { IncomesModule } from '../incomes/incomes.module'
import { UsersSavingsModule } from '../users-savings/users-savings.module'

import { SavingsController } from './savings.controller'
import { SavingsRepository } from './savings.repository'
import { SavingsScheduler } from './savings.scheduler'
import { MandatorySavingsService } from './savings.service'

@Module({
  imports: [
    DatabaseModule,
    UsersSavingsModule,
    IncomesModule,
    CashbookModule,
    ConfigModule,
    ScheduleModule.forRoot()
  ],
  controllers: [SavingsController],
  providers: [MandatorySavingsService, SavingsRepository, SavingsScheduler],
  exports: [MandatorySavingsService]
})
export class SavingsModule {}

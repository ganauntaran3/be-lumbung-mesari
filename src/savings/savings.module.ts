import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'

import { CashbookModule } from '../cashbook/cashbook.module'
import { DatabaseModule } from '../database/database.module'
import { IncomesModule } from '../incomes/incomes.module'
import { UsersSavingsModule } from '../users-savings/users-savings.module'

import { MandatorySavingsService } from './mandatory-savings.service'
import { PrincipalSavingsService } from './principal-savings.service'
import { SavingsController } from './savings.controller'
import { SavingsRepository } from './savings.repository'
import { SavingsScheduler } from './savings.scheduler'

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
  providers: [
    MandatorySavingsService,
    PrincipalSavingsService,
    SavingsRepository,
    SavingsScheduler
  ],
  exports: [MandatorySavingsService, PrincipalSavingsService]
})
export class SavingsModule {}

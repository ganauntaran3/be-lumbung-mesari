import { Module, forwardRef } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { ConfigModule } from '@nestjs/config'
import { SavingsController } from './savings.controller'
import { MandatorySavingsService } from './mandatory-savings.service'
import { PrincipalSavingsService } from './principal-savings.service'
import { SavingsRepository } from './savings.repository'
import { SavingsScheduler } from './savings.scheduler'
import { DatabaseModule } from '../database/database.module'
import { UsersModule } from '../users/users.module'
import { IncomesModule } from '../incomes/incomes.module'
import { CashbookModule } from '../cashbook/cashbook.module'

@Module({
    imports: [
        DatabaseModule,
        forwardRef(() => UsersModule),
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
export class SavingsModule { }
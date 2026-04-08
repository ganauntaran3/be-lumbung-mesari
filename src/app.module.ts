import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { CashbookModule } from './cashbook/cashbook.module'
import {
  MAXIMUM_AUTH_REQUESTS_PER_MINUTE,
  MAXIMUM_AUTH_REQUESTS_PER_MINUTE_NAME,
  MAXIMUM_REQUESTS_PER_MINUTE,
  MILLISECONDS_IN_MINUTE
} from './common/constants'
import { envValidationSchema } from './config/env.validation'
import { ExpensesModule } from './expenses/expenses.module'
import { IncomesModule } from './incomes/incomes.module'
import { LoansModule } from './loans/loans.module'
import { NotificationModule } from './notifications/notification.module'
import { ReportsModule } from './reports/reports.module'
import { SavingsModule } from './savings/savings.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: MILLISECONDS_IN_MINUTE,
        limit: MAXIMUM_REQUESTS_PER_MINUTE
      },
      {
        name: MAXIMUM_AUTH_REQUESTS_PER_MINUTE_NAME,
        ttl: MILLISECONDS_IN_MINUTE,
        limit: MAXIMUM_AUTH_REQUESTS_PER_MINUTE
      }
    ]),
    NotificationModule,
    UsersModule,
    AuthModule,
    SavingsModule,
    IncomesModule,
    CashbookModule,
    ExpensesModule,
    LoansModule,
    ReportsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { CashbookModule } from './cashbook/cashbook.module'
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
      envFilePath: '.env'
    }),
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
  providers: [AppService]
})
export class AppModule {}

import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UsersModule } from './users/users.module'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { NotificationModule } from './notifications/notification.module'
import { SavingsModule } from './savings/savings.module'
import { IncomesModule } from './incomes/incomes.module'
import { CashbookModule } from './cashbook/cashbook.module'

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
    CashbookModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}

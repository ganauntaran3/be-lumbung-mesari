import { Module } from '@nestjs/common'

import { LoansModule } from '../loans/loans.module'
import { SavingsModule } from '../savings/savings.module'
import { UsersModule } from '../users/users.module'

import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'

@Module({
  imports: [SavingsModule, UsersModule, LoansModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService]
})
export class ReportsModule {}

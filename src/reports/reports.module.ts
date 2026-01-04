import { Module } from '@nestjs/common'

import { SavingsModule } from '../savings/savings.module'
import { UsersModule } from '../users/users.module'

import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'

@Module({
  imports: [SavingsModule, UsersModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService]
})
export class ReportsModule {}

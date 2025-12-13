import { Module } from '@nestjs/common'

import { DatabaseModule } from '../database/database.module'

import { LoansController } from './loans.controller'
import { LoansRepository } from './loans.repository'
import { LoansScheduler } from './loans.scheduler'
import { LoansService } from './loans.service'

@Module({
  imports: [DatabaseModule],
  controllers: [LoansController],
  providers: [LoansService, LoansRepository, LoansScheduler],
  exports: [LoansService]
})
export class LoansModule {}

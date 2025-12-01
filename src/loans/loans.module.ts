import { Module } from '@nestjs/common'

import { DatabaseModule } from '../database/database.module'

import { LoansController } from './loans.controller'
import { LoansRepository } from './loans.repository'
import { LoansService } from './loans.service'

@Module({
  imports: [DatabaseModule],
  controllers: [LoansController],
  providers: [LoansService, LoansRepository],
  exports: [LoansService]
})
export class LoansModule {}

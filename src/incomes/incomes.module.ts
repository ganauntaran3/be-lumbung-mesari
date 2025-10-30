import { Module } from '@nestjs/common'

import { DatabaseModule } from '../database/database.module'

import { IncomesRepository } from './incomes.repository'
import { IncomesService } from './incomes.service'

@Module({
  imports: [DatabaseModule],
  providers: [IncomesService, IncomesRepository],
  exports: [IncomesService]
})
export class IncomesModule {}

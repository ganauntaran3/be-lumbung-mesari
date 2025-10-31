import { Module } from '@nestjs/common'

import { CashbookModule } from '../cashbook/cashbook.module'
import { DatabaseModule } from '../database/database.module'

import { ExpenseCategoriesRepository } from './expense-categories.repository'
import { ExpensesController } from './expenses.controller'
import { ExpensesRepository } from './expenses.repository'
import { ExpensesService } from './expenses.service'

@Module({
  imports: [DatabaseModule, CashbookModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesRepository, ExpenseCategoriesRepository],
  exports: [ExpensesService, ExpensesRepository, ExpenseCategoriesRepository]
})
export class ExpensesModule {}

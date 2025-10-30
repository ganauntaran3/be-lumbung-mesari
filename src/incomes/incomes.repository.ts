import { Injectable, Logger } from '@nestjs/common'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'

import { IncomeTable, IncomeCategoryTable } from './interfaces/income.interface'

@Injectable()
export class IncomesRepository extends BaseRepository<IncomeTable> {
  private readonly logger = new Logger(IncomesRepository.name)

  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService, 'incomes')
  }

  async createIncome(
    data: Omit<IncomeTable, 'id' | 'created_at'>,
    trx?: any
  ): Promise<IncomeTable> {
    try {
      this.logger.debug(
        `Creating income record for category ${data.income_category_id}`
      )

      const query = trx ? trx('incomes') : this.knex('incomes')
      const [result] = await query
        .insert({
          ...data,
          created_at: new Date()
        })
        .returning('*')

      this.logger.log(`Income created successfully: ${result.id}`)
      return result as IncomeTable
    } catch (error) {
      this.logger.error('Failed to create income:', error)
      throw error
    }
  }

  async findCategoryByCode(
    code: string,
    trx?: any
  ): Promise<IncomeCategoryTable | null> {
    try {
      const query = trx
        ? trx('income_categories')
        : this.knex('income_categories')
      const result = await query.where('code', code).first()

      return result as IncomeCategoryTable | null
    } catch (error) {
      this.logger.error(
        `Failed to find income category by code ${code}:`,
        error
      )
      throw error
    }
  }
}

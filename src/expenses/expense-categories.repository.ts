import { Injectable } from '@nestjs/common'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import { ExpenseCategoryTable } from '../interface/expenses'

@Injectable()
export class ExpenseCategoriesRepository extends BaseRepository<ExpenseCategoryTable> {
  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService, 'expense_categories')
  }

  async findByCode(code: string): Promise<ExpenseCategoryTable | null> {
    const result = await this.knex(this.tableName).where('code', code).first()

    return result || null
  }

  async findAllCategories(): Promise<ExpenseCategoryTable[]> {
    const result = await this.knex(this.tableName)
      .select('*')
      .orderBy('name', 'asc')

    return result as ExpenseCategoryTable[]
  }
}

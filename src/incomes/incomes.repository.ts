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

    /**
     * Create an income record
     */
    async createIncome(
        data: Omit<IncomeTable, 'id' | 'created_at'>
    ): Promise<IncomeTable> {
        try {
            this.logger.debug(`Creating income record for category ${data.category_id}`)

            const [result] = await this.knex('incomes')
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

    /**
     * Find income category by code
     */
    async findCategoryByCode(code: string): Promise<IncomeCategoryTable | null> {
        try {
            const result = await this.knex('income_categories')
                .where('code', code)
                .first()

            return result as IncomeCategoryTable | null
        } catch (error) {
            this.logger.error(`Failed to find income category by code ${code}:`, error)
            throw error
        }
    }
}

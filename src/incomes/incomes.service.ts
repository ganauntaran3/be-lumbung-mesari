import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { IncomesRepository } from './incomes.repository'
import { IncomeTable } from './interfaces/income.interface'

@Injectable()
export class IncomesService {
    private readonly logger = new Logger(IncomesService.name)

    constructor(private readonly incomesRepository: IncomesRepository) { }

    /**
     * Create income from principal savings
     * Called when admin approves user and marks principal savings as paid
     */
    async createPrincipalSavingsIncome(
        userId: string,
        amount: number,
        notes?: string
    ): Promise<IncomeTable> {
        try {
            this.logger.log(`Creating principal savings income for user ${userId} with amount ${amount}`)

            // Find principal_savings category
            const category = await this.incomesRepository.findCategoryByCode('principal_savings')

            if (!category) {
                throw new NotFoundException('Income category "principal_savings" not found. Please run seed.')
            }

            const income = await this.incomesRepository.createIncome({
                category_id: category.id,
                amount: amount.toString(),
                user_id: userId,
                notes: notes || 'Simpanan pokok dari anggota baru'
            })

            this.logger.log(`Principal savings income created: ${income.id}`)

            return income
        } catch (error) {
            this.logger.error(`Failed to create principal savings income for user ${userId}:`, error)
            throw error
        }
    }
}

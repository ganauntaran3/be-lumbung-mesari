import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { IncomesRepository } from './incomes.repository'
import { IncomeTable } from './interfaces/income.interface'

@Injectable()
export class IncomesService {
  private readonly logger = new Logger(IncomesService.name)

  constructor(private readonly incomesRepository: IncomesRepository) {}

  async createPrincipalSavingsIncome(
    principalSavingsId: string,
    amount: number,
    notes?: string,
    trx?: any
  ): Promise<IncomeTable> {
    try {
      this.logger.log(`Creating principal savings income with amount ${amount}`)

      // Find principal_savings category
      const category = await this.incomesRepository.findCategoryByCode(
        'principal_savings',
        trx
      )

      if (!category) {
        throw new NotFoundException(
          'Income category "principal_savings" not found. Please run seed.'
        )
      }

      const income = await this.incomesRepository.createIncome(
        {
          name: 'Simpanan Pokok',
          income_category_id: category.id,
          amount,
          principal_saving_id: principalSavingsId,
          notes: notes || 'Simpanan pokok dari anggota baru'
        },
        trx
      )

      this.logger.log(`Principal savings income created: ${income.id}`)

      return income
    } catch (error) {
      this.logger.error(`Failed to create principal savings income:`, error)
      throw error
    }
  }

  async createMandatorySavingsIncome(
    mandatorySavingsId: string,
    amount: number,
    notes?: string,
    trx?: any
  ): Promise<IncomeTable> {
    try {
      this.logger.log(`Creating mandatory savings income with amount ${amount}`)

      // Find mandatory_savings category
      const category = await this.incomesRepository.findCategoryByCode(
        'mandatory_savings',
        trx
      )

      if (!category) {
        throw new NotFoundException(
          'Income category "mandatory_savings" not found. Please run seed.'
        )
      }

      const income = await this.incomesRepository.createIncome(
        {
          name: 'Simpanan Wajib',
          income_category_id: category.id,
          amount,
          mandatory_saving_id: mandatorySavingsId,
          notes: notes || 'Simpanan wajib dari anggota'
        },
        trx
      )

      this.logger.log(`Mandatory savings income created: ${income.id}`)

      return income
    } catch (error) {
      this.logger.error(`Failed to create mandatory savings income:`, error)
      throw error
    }
  }

  async createInstallmentPrincipalIncome(
    installmentId: string,
    amount: number,
    notes: string,
    trx?: any
  ): Promise<IncomeTable> {
    try {
      this.logger.log(
        `Creating installment principal income with amount ${amount}`
      )

      const category = await this.incomesRepository.findCategoryByCode(
        'installment_principal',
        trx
      )

      if (!category) {
        throw new NotFoundException(
          'Income category "installment_principal" not found. Please run seed.'
        )
      }

      const income = await this.incomesRepository.createIncome(
        {
          name: notes,
          income_category_id: category.id,
          amount,
          installment_id: installmentId,
          notes
        },
        trx
      )

      this.logger.log(`Installment principal income created: ${income.id}`)

      return income
    } catch (error) {
      this.logger.error(`Failed to create installment principal income:`, error)
      throw error
    }
  }

  async createInstallmentInterestIncome(
    installmentId: string,
    amount: number,
    notes: string,
    trx?: any
  ): Promise<IncomeTable> {
    try {
      this.logger.log(
        `Creating installment interest income with amount ${amount}`
      )

      const category = await this.incomesRepository.findCategoryByCode(
        'loan_interest',
        trx
      )

      if (!category) {
        throw new NotFoundException(
          'Income category "loan_interest" not found. Please run seed.'
        )
      }

      const income = await this.incomesRepository.createIncome(
        {
          name: notes,
          income_category_id: category.id,
          amount,
          installment_id: installmentId,
          notes
        },
        trx
      )

      this.logger.log(`Installment interest income created: ${income.id}`)

      return income
    } catch (error) {
      this.logger.error(`Failed to create installment interest income:`, error)
      throw error
    }
  }

  async createInstallmentPenaltyIncome(
    installmentId: string,
    amount: number,
    notes: string,
    trx?: any
  ): Promise<IncomeTable> {
    try {
      this.logger.log(
        `Creating installment penalty income with amount ${amount}`
      )

      const category = await this.incomesRepository.findCategoryByCode(
        'late_payment_penalty',
        trx
      )

      if (!category) {
        throw new NotFoundException(
          'Income category "late_payment_penalty" not found. Please run seed.'
        )
      }

      const income = await this.incomesRepository.createIncome(
        {
          name: notes,
          income_category_id: category.id,
          amount,
          installment_id: installmentId,
          notes
        },
        trx
      )

      this.logger.log(`Installment penalty income created: ${income.id}`)

      return income
    } catch (error) {
      this.logger.error(`Failed to create installment penalty income:`, error)
      throw error
    }
  }
}

import { Injectable, Logger } from '@nestjs/common'
import { Knex } from 'knex'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import { PaginationOptions, PaginationResult } from '../interface/pagination'

import {
  CreateLoanData,
  Loan,
  LoanPeriodTable,
  LoanWithUser
} from './interface/loans.interface'
import { Installment } from './interface/installment.interface'

@Injectable()
export class LoansRepository extends BaseRepository<Loan> {
  private readonly logger = new Logger(LoansRepository.name)

  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService, 'loans')
  }

  async findLoanPeriodById(id: string): Promise<LoanPeriodTable | undefined> {
    const result = await this.knex('loan_periods').where('id', id).first()
    return result
  }

  async findAllLoanPeriods(): Promise<LoanPeriodTable[]> {
    const results = await this.knex('loan_periods')
      .select('id', 'tenor', 'interest_rate')
      .orderBy('tenor', 'asc')
    return results
  }

  async createLoan(
    loanData: CreateLoanData,
    trx?: Knex.Transaction
  ): Promise<Loan> {
    const query = trx ? trx('loans') : this.knex('loans')
    const [result] = await query.insert(loanData).returning('*')
    return result as Loan
  }

  async findAllWithPagination(
    options: PaginationOptions & {
      status?: string
      search?: string
      userId?: string
    } = {}
  ): Promise<PaginationResult<LoanWithUser>> {
    const {
      status,
      search,
      userId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options

    try {
      const offset = (page - 1) * limit

      let query = this.knex('loans')
        .join('users', 'users.id', 'loans.user_id')
        .join('loan_periods', 'loan_periods.id', 'loans.loan_period_id')

      if (status) {
        query = query.where('loans.status', status)
      }

      if (userId) {
        query = query.where('loans.user_id', userId)
      }

      if (search) {
        query = query.where(function () {
          this.where('users.fullname', 'ilike', `%${search}%`)
            .orWhere('users.email', 'ilike', `%${search}%`)
            .orWhere('loans.id', 'ilike', `%${search}%`)
        })
      }

      const countQuery = query.clone()
      const [{ count }] = await countQuery.count('loans.id as count')
      const totalData = Number.parseInt(count as string, 10)

      const dataQuery = query.select([
        'loans.*',
        'users.fullname as user_fullname',
        'users.email as user_email',
        'loan_periods.tenor',
        'loan_periods.interest_rate'
      ])

      // Map camelCase to snake_case for database columns
      const sortByMap: Record<string, string> = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        id: 'id',
        status: 'status',
        principalAmount: 'principal_amount'
      }

      const dbSortBy = sortByMap[sortBy] || sortBy
      const sortColumn = dbSortBy.includes('.') ? dbSortBy : `loans.${dbSortBy}`
      const data = await dataQuery
        .orderBy(sortColumn, sortOrder)
        .limit(limit)
        .offset(offset)

      const pagination = this.createPaginationMetadata(page, limit, totalData)

      return {
        data: data as LoanWithUser[],
        ...pagination
      }
    } catch (error) {
      this.logger.error('Error fetching loans:', error)
      throw error
    }
  }

  async findById(id: string): Promise<LoanWithUser | undefined> {
    const result = await this.knex('loans')
      .join('users', 'users.id', 'loans.user_id')
      .join('loan_periods', 'loan_periods.id', 'loans.loan_period_id')
      .select([
        'loans.*',
        'users.fullname as user_fullname',
        'users.email as user_email',
        'loan_periods.tenor',
        'loan_periods.interest_rate'
      ])
      .where('loans.id', id)
      .first()

    return result as LoanWithUser | undefined
  }

  async updateLoanStatus(
    loanId: string,
    status: string,
    approvedBy: string | null,
    notes: string | null,
    trx?: Knex.Transaction
  ): Promise<Loan> {
    const query = trx ? trx('loans') : this.knex('loans')

    const updateData: any = {
      status,
      notes,
      updated_at: new Date()
    }

    if (status === 'approved') {
      updateData.approved_by = approvedBy
      updateData.approved_at = new Date()
    }

    const [result] = await query
      .where('id', loanId)
      .update(updateData)
      .returning('*')

    if (!result) {
      throw new Error(`Loan with id ${loanId} not found`)
    }

    return result as Loan
  }

  async createInstallments(
    installments: Partial<Installment>[],
    trx?: Knex.Transaction
  ): Promise<Installment[]> {
    const query = trx ? trx('installments') : this.knex('installments')
    const results = await query.insert(installments).returning('*')
    return results as Installment[]
  }

  async findInstallmentsByLoanId(loanId: string): Promise<Installment[]> {
    const results = await this.knex('installments')
      .where('loan_id', loanId)
      .orderBy('installment_number', 'asc')

    return results as Installment[]
  }
}

import { Injectable, Logger } from '@nestjs/common'

import { Knex } from 'knex'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import { PaginationOptions, PaginationResult } from '../interface/pagination'

import { Installment } from './interface/installment.interface'
import {
  CreateLoanData,
  LoanPeriodTable,
  LoanTable,
  LoanWithUser
} from './interface/loans.interface'

@Injectable()
export class LoansRepository extends BaseRepository<LoanTable> {
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
  ): Promise<LoanTable> {
    const query = trx ? trx('loans') : this.knex('loans')
    const [result] = await query.insert(loanData).returning('*')
    return result as LoanTable
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
            .orWhere('users.username', 'ilike', `%${search}%`)
            .orWhere('users.email', 'ilike', `%${search}%`)
        })
      }

      const countQuery = query.clone()
      const [{ count }] = await countQuery.count('loans.id as count')
      const totalData = Number.parseInt(count as string, 10)

      const dataQuery = query.select([
        'loans.*',
        'users.fullname as fullname',
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

  async findUserLoans(userId: string): Promise<LoanTable[]> {
    try {
      let query = this.knex('loans').where('loans.user_id', userId)

      const data = await query
        .select('loans.*')
        .orderBy('loans.created_at', 'desc')
        .limit(3)

      return data as LoanTable[]
    } catch (error) {
      this.logger.error('Error fetching user loans:', error)
      throw error
    }
  }

  async findById(
    id: string,
    trx?: Knex.Transaction
  ): Promise<LoanTable | undefined> {
    const query = trx ? trx('loans') : this.knex('loans')
    let resultQuery = query
      .join('loan_periods', 'loan_periods.id', 'loans.loan_period_id')
      .select([
        'loans.id',
        'loans.user_id',
        'loans.loan_period_id',
        'loans.principal_amount',
        'loans.disbursed_amount',
        'loans.interest_amount',
        'loans.monthly_payment',
        'loans.last_month_payment',
        'loans.total_payable_amount',
        'loans.installment_late_amount',
        'loans.disbursed_at',
        'loans.start_date',
        'loans.end_date',
        'loans.status',
        'loans.notes',
        'loans.approved_by',
        'loans.approved_at',
        'loans.created_at',
        'loans.updated_at',
        'loan_periods.tenor',
        'loan_periods.interest_rate'
      ])
      .where('loans.id', id)

    if (trx) {
      resultQuery.forUpdate()
    }

    return await resultQuery.first()
  }

  async findByIdWithUser(
    id: string,
    trx?: Knex.Transaction
  ): Promise<LoanWithUser | undefined> {
    const query = trx ? trx('loans') : this.knex('loans')
    let resultQuery = query
      .join('users', 'users.id', 'loans.user_id')
      .join('loan_periods', 'loan_periods.id', 'loans.loan_period_id')
      .select([
        'loans.id',
        'loans.user_id',
        'loans.loan_period_id',
        'loans.principal_amount',
        'loans.disbursed_amount',
        'loans.interest_amount',
        'loans.monthly_payment',
        'loans.last_month_payment',
        'loans.total_payable_amount',
        'loans.installment_late_amount',
        'loans.disbursed_at',
        'loans.start_date',
        'loans.end_date',
        'loans.status',
        'loans.notes',
        'loans.approved_by',
        'loans.approved_at',
        'loans.created_at',
        'loans.updated_at',
        'loan_periods.tenor',
        'loan_periods.interest_rate',
        'users.fullname as fullname',
        'users.email as user_email'
      ])
      .where('loans.id', id)

    if (trx) {
      resultQuery.forUpdate()
    }

    return await resultQuery.first()
  }

  async updateLoanStatus(
    loanId: string,
    status: string,
    approvedBy: string | null,
    notes: string | null,
    trx?: Knex.Transaction
  ): Promise<LoanTable> {
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

    return result
  }

  async disburseLoan(
    loanId: string,
    trx?: Knex.Transaction
  ): Promise<LoanTable> {
    const query = trx ? trx('loans') : this.knex('loans')

    const [result] = await query
      .where('id', loanId)
      .update({
        status: 'active',
        disbursed_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    if (!result) {
      throw new Error(`Loan with id ${loanId} not found`)
    }

    return result as LoanTable
  }

  async createInstallments(
    installments: Partial<Installment>[],
    trx?: Knex.Transaction
  ): Promise<Installment[]> {
    const query = trx ? trx('installments') : this.knex('installments')
    const results = await query.insert(installments).returning('*')
    return results as Installment[]
  }

  async findInstallmentById(
    installmentId: string,
    trx?: Knex.Transaction
  ): Promise<Installment | null> {
    const query = trx ? trx('installments') : this.knex('installments')
    const result = await query
      .where('id', installmentId)
      .forUpdate() // Lock the row to prevent concurrent modifications
      .first()

    return result || null
  }

  async findInstallmentsByLoanId(loanId: string): Promise<Installment[]> {
    const results = await this.knex('installments')
      .where('loan_id', loanId)
      .orderBy('installment_number', 'asc')

    return results as Installment[]
  }

  async findOverdueInstallments(beforeDate: Date): Promise<Installment[]> {
    const results = await this.knex('installments')
      .where('status', 'due')
      .where('due_date', '<=', beforeDate)
      .orderBy('loan_id', 'asc')
      .orderBy('installment_number', 'asc')

    return results as Installment[]
  }

  async settleInstallment(
    installmentId: string,
    adminId: string,
    trx?: Knex.Transaction
  ): Promise<Installment> {
    const query = trx ? trx('installments') : this.knex('installments')

    const [result] = await query
      .where('id', installmentId)
      .update({
        status: 'paid',
        processed_by: adminId,
        paid_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    if (!result) {
      throw new Error(`Installment with id ${installmentId} not found`)
    }

    return result as Installment
  }

  async updateInstallmentStatus(
    installmentId: string,
    status: 'due' | 'overdue' | 'paid' | 'partial',
    trx?: Knex.Transaction
  ): Promise<Installment> {
    const query = trx ? trx('installments') : this.knex('installments')

    const [result] = await query
      .where('id', installmentId)
      .update({
        status,
        updated_at: new Date()
      })
      .returning('*')

    if (!result) {
      throw new Error(`Installment with id ${installmentId} not found`)
    }

    return result as Installment
  }

  async addPenaltyToInstallment(
    installmentId: string,
    penaltyAmount: number,
    trx?: Knex.Transaction
  ): Promise<Installment> {
    const query = trx ? trx('installments') : this.knex('installments')

    // Get current penalty amount
    const [currentInstallment] = await query
      .where('id', installmentId)
      .select('penalty_amount', 'total_amount')

    if (!currentInstallment) {
      throw new Error(`Installment with id ${installmentId} not found`)
    }

    const currentPenalty = parseFloat(currentInstallment.penalty_amount) || 0
    const currentTotal = parseFloat(currentInstallment.total_amount) || 0
    const newPenalty = currentPenalty + penaltyAmount
    const newTotal = currentTotal + penaltyAmount

    const [result] = await query
      .where('id', installmentId)
      .update({
        penalty_amount: newPenalty.toFixed(4),
        total_amount: newTotal.toFixed(4),
        updated_at: new Date()
      })
      .returning('*')

    return result as Installment
  }

  /**
   * Get monthly installment payment totals
   * Used for financial reporting
   */
  async getMonthlyInstallmentPayments(
    year: number,
    month: number
  ): Promise<{
    total_principal: number
    total_interest: number
    total_penalty: number
  }> {
    try {
      const startDate = new Date(year, month - 1, 1) // month is 1-12
      const endDate = new Date(year, month, 0, 23, 59, 59) // Last day of month

      this.logger.debug(
        `Fetching installment payments for ${year}-${month} (${startDate} to ${endDate})`
      )

      const result = await this.knex('installments')
        .where('status', 'paid')
        .whereBetween('paid_at', [startDate, endDate])
        .sum('principal_amount as total_principal')
        .sum('interest_amount as total_interest')
        .sum('penalty_amount as total_penalty')
        .first()

      return {
        total_principal: parseFloat(result?.total_principal || '0'),
        total_interest: parseFloat(result?.total_interest || '0'),
        total_penalty: parseFloat(result?.total_penalty || '0')
      }
    } catch (error) {
      this.logger.error(
        `Failed to get monthly installment payments for ${year}-${month}:`,
        error
      )
      throw error
    }
  }

  async getKonvenPayments(
    year: number,
    month: number
  ): Promise<
    Array<{
      loan_id: string
      user_fullname: string
      total_principal: number
    }>
  > {
    try {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)

      this.logger.debug(`Detecting konven payments for ${year}-${month}`)

      // Find loans where:
      // 1. All installments are paid
      // 2. The last installment was paid in the target month
      const konvenLoans = await this.knex('installments as i')
        .join('loans as l', 'i.loan_id', 'l.id')
        .join('users as u', 'l.user_id', 'u.id')
        .select(
          'i.loan_id',
          'u.fullname as user_fullname',
          this.knex.raw('COUNT(*) as total_installments'),
          this.knex.raw(
            "COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_installments"
          ),
          this.knex.raw('MAX(i.paid_at) as last_payment_date')
        )
        .groupBy('i.loan_id', 'u.fullname')
        .having(
          this.knex.raw('COUNT(*) = COUNT(CASE WHEN i.status = ? THEN 1 END)', [
            'paid'
          ])
        )
        .havingRaw('MAX(i.paid_at) BETWEEN ? AND ?', [startDate, endDate])

      // For each konven loan, sum the principal amounts paid in target month
      const konvenPayments = await Promise.all(
        konvenLoans.map(async (loan) => {
          const result = await this.knex('installments')
            .where('loan_id', loan.loan_id)
            .where('status', 'paid')
            .whereBetween('paid_at', [startDate, endDate])
            .sum('principal_amount as sum')
            .first()

          return {
            loan_id: loan.loan_id,
            user_fullname: loan.user_fullname,
            total_principal: parseFloat(result?.sum || '0')
          }
        })
      )

      this.logger.debug(
        `Found ${konvenPayments.length} konven payments for ${year}-${month}`
      )

      return konvenPayments
    } catch (error) {
      this.logger.error(
        `Failed to get konven payments for ${year}-${month}:`,
        error
      )
      throw error
    }
  }
}

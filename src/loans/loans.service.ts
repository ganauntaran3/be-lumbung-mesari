import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import Decimal from 'decimal.js'

import { DatabaseService } from '../database/database.service'

import { CalculateLoanRequestDto } from './dto/calculate-loan.dto'
import { CreateLoanDto } from './dto/create-loan.dto'
import { ApproveLoanDto, RejectLoanDto } from './dto/loan-approval.dto'
import { LoansQueryDto } from './dto/loans-query.dto'
import { Installment } from './interface/installment.interface'
import {
  CalculateLoanResponse,
  LoanPeriodTable,
  LoanWithUser
} from './interface/loans.interface'
import { LoansRepository } from './loans.repository'
import { roundUpToNearest500Or1000 } from './utils'

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name)

  constructor(
    private readonly loansRepository: LoansRepository,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
  ) {}

  private transformLoanPeriods(loanPeriods: LoanPeriodTable[]) {
    return loanPeriods.map((loanPeriod) => ({
      id: loanPeriod.id,
      tenor: loanPeriod.tenor,
      interestRate: loanPeriod.interest_rate
    }))
  }

  private transformLoans(loans: LoanWithUser[]) {
    return loans.map((loan) => ({
      id: loan.id,
      tenor: loan.tenor,
      interestRate: loan.interest_rate
    }))
  }

  async findAllPeriods() {
    const loanPeriods = await this.loansRepository.findAllLoanPeriods()
    return this.transformLoanPeriods(loanPeriods)
  }

  async createLoan(userId: string, createLoanDto: CreateLoanDto) {
    const { loanPeriodId, amount, notes } = createLoanDto

    const loanPeriod =
      await this.loansRepository.findLoanPeriodById(loanPeriodId)

    if (!loanPeriod) {
      throw new NotFoundException('Loan period not found')
    }

    // Calculate loan details
    const principal = new Decimal(amount)
    const interestRate = new Decimal(loanPeriod.interest_rate)
    const tenor = loanPeriod.tenor

    // Admin fee: 2% of principal
    const adminFeeRate = new Decimal(
      this.configService.get<number>('ADMIN_FEE_RATE', 0.02)
    )
    const adminFee = principal.mul(adminFeeRate)
    const disbursedAmount = principal.minus(adminFee)

    // Calculate payment details using shared method
    const paymentDetails = this.calculateLoanPayments(
      amount,
      interestRate.toNumber(),
      tenor
    )

    // Calculate dates
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + tenor)

    const loanData = {
      user_id: userId,
      loan_period_id: loanPeriodId,
      principal_amount: principal.toNumber(),
      admin_fee_amount: adminFee.toNumber(),
      disbursed_amount: disbursedAmount.toNumber(),
      interest_amount: paymentDetails.monthlyInterest,
      monthly_payment: paymentDetails.monthlyPayment,
      last_month_payment: paymentDetails.lastMonthPayment,
      total_payable_amount: paymentDetails.totalPayable,
      start_date: startDate,
      end_date: endDate,
      status: 'pending' as const,
      notes: notes || null
    }

    const loan = await this.loansRepository.createLoan(loanData)

    this.logger.log(`Loan created for user ${userId}: ${loan.id}`)

    return this.transformLoanRecord(loan)
  }

  private transformLoanRecord(loan: any) {
    return {
      id: loan.id,
      userId: loan.user_id,
      loanPeriodId: loan.loan_period_id,
      principalAmount: parseFloat(loan.principal_amount),
      adminFeeAmount: parseFloat(loan.admin_fee_amount),
      disbursedAmount: parseFloat(loan.disbursed_amount),
      interestAmount: parseFloat(loan.interest_amount),
      monthlyPayment: parseFloat(loan.monthly_payment),
      lastMonthPayment: parseFloat(loan.last_month_payment),
      totalPayableAmount: parseFloat(loan.total_payable_amount),
      installmentLateAmount: loan.installment_late_amount
        ? loan.installment_late_amount
        : null,
      startDate: loan.start_date,
      endDate: loan.end_date,
      status: loan.status,
      approvedBy: loan.approved_by,
      approvedAt: loan.approved_at,
      disbursedAt: loan.disbursed_at,
      notes: loan.notes,
      createdAt: loan.created_at,
      updatedAt: loan.updated_at
    }
  }

  async calculateLoan(
    calculateDto: CalculateLoanRequestDto
  ): Promise<CalculateLoanResponse> {
    const { amount, loanPeriodId } = calculateDto

    const loanPeriod =
      await this.loansRepository.findLoanPeriodById(loanPeriodId)

    if (!loanPeriod) {
      throw new NotFoundException('Loan period not found')
    }

    // Calculate loan details
    const loanAmount = new Decimal(amount)
    const interestRate = new Decimal(loanPeriod.interest_rate)
    const tenor = loanPeriod.tenor

    // Admin fee: 2% of principal
    const adminFee = loanAmount.mul(
      this.configService.get<number>('ADMIN_FEE_RATE', 0.02)
    )
    const disbursedAmount = loanAmount.minus(adminFee)

    // Calculate payment details
    const { monthlyInterest, monthlyPayment, lastMonthPayment } =
      this.calculateLoanPayments(amount, interestRate.toNumber(), tenor)

    const response: CalculateLoanResponse = {
      principalAmount: loanAmount.toNumber(),
      adminFee: adminFee.toNumber(),
      disbursedAmount: disbursedAmount.toNumber(),
      tenor,
      interestRate: interestRate.toNumber(),
      monthlyInterest,
      monthlyPayment
    }

    // Only include lastMonthlyPayment if it's different from monthlyPayment
    if (lastMonthPayment !== monthlyPayment) {
      response.lastMonthPayment = lastMonthPayment
    }

    return response
  }

  async findAll(queryDto: LoansQueryDto, userId?: string) {
    const options = {
      page: queryDto.page,
      limit: queryDto.limit,
      status: queryDto.status,
      search: queryDto.search,
      userId
    }

    return await this.loansRepository.findAllWithPagination(options)
  }

  async findById(loanId: string): Promise<LoanWithUser> {
    const loan = await this.loansRepository.findById(loanId)

    if (!loan) {
      throw new NotFoundException('Loan not found')
    }

    return loan
  }

  async findUserLoans(userId: string, options: any = {}) {
    this.logger.log(`Fetching loans for user ${userId}`)
    return await this.loansRepository.findUserLoans(userId, options)
  }

  async approveLoan(
    loanId: string,
    approvalDto: ApproveLoanDto,
    adminId: string
  ) {
    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      const loan = await this.loansRepository.findById(loanId, trx)

      if (!loan) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Loan not found',
          error: 'Not Found'
        })
      }

      if (loan.status !== 'pending') {
        throw new BadRequestException({
          statusCode: 400,
          message: `Cannot approve loan with status: ${loan.status}`,
          error: 'Bad Request'
        })
      }

      // Update loan status to approved (no installments generated yet)
      await this.loansRepository.updateLoanStatus(
        loanId,
        'approved',
        adminId,
        approvalDto.notes || null,
        trx
      )

      this.logger.log(`Loan ${loanId} approved by admin ${adminId}`)

      await trx.commit()

      return {
        message: 'Loan approved successfully',
        status: 'approved',
        loanId
      }
    } catch (error) {
      if (!trx.isCompleted()) {
        await trx.rollback()
        this.logger.error(`Transaction rolled back for loan ${loanId}`)
      }
      throw error
    }
  }

  async disburseLoan(loanId: string, adminId: string) {
    const loan = await this.loansRepository.findById(loanId)

    if (!loan) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Loan not found',
        error: 'Not Found'
      })
    }

    if (loan.status !== 'approved') {
      throw new BadRequestException({
        statusCode: 400,
        message: `Cannot disburse loan with status: ${loan.status}. Loan must be approved first.`,
        error: 'Bad Request'
      })
    }

    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      this.logger.log(`Starting loan disbursement for loan ${loanId}`)

      // Update loan status to active and set disbursed_at
      await this.loansRepository.disburseLoan(loanId, trx)

      // Generate installments with rounding
      const installments = await this.generateInstallments(loan, adminId)
      await this.loansRepository.createInstallments(installments, trx)

      await trx.commit()
      this.logger.log(`Loan ${loanId} disbursed successfully`)

      return {
        message: 'Loan disbursed successfully, installments generated',
        status: 'active',
        loanId
      }
    } catch (error) {
      if (!trx.isCompleted()) {
        await trx.rollback()
        this.logger.error(`Transaction rolled back for loan ${loanId}`)
      }
      throw error
    }
  }

  async rejectLoan(loanId: string, rejectDto: RejectLoanDto, adminId: string) {
    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      const loan = await this.loansRepository.findById(loanId, trx)

      if (!loan) {
        throw new NotFoundException('Loan not found')
      }

      if (loan.status !== 'pending') {
        throw new BadRequestException(
          `Cannot reject loan with status: ${loan.status}`
        )
      }

      await this.loansRepository.updateLoanStatus(
        loanId,
        'rejected',
        null,
        rejectDto.reason,
        trx
      )

      this.logger.log(`Loan ${loanId} rejected by admin ${adminId}`)
      await trx.commit()

      return {
        message: 'Loan rejected successfully',
        status: 'rejected',
        loanId
      }
    } catch (error) {
      if (!trx.isCompleted()) {
        await trx.rollback()
        this.logger.error(`Transaction rolled back for loan ${loanId}`)
      }
      throw error
    }
  }

  private async generateInstallments(
    loan: LoanWithUser,
    processedBy: string
  ): Promise<Partial<Installment>[]> {
    const installments: Partial<Installment>[] = []
    const tenor = loan.tenor

    // Use the pre-calculated rounded values from the loan
    const monthlyPayment = new Decimal(loan.monthly_payment)
    const lastMonthPayment = new Decimal(loan.last_month_payment)
    const monthlyInterest = new Decimal(loan.interest_amount)

    // Calculate rounded monthly principal (monthly payment - interest)
    const roundedMonthlyPrincipal = monthlyPayment.minus(monthlyInterest)

    // Calculate last month principal as remainder
    const principalPaidInFirstMonths = roundedMonthlyPrincipal.mul(tenor - 1)
    const lastMonthPrincipal = new Decimal(loan.principal_amount).minus(
      principalPaidInFirstMonths
    )

    // Get disbursement date from the loan (will be set when disburseLoan is called)
    const disbursementDate = new Date()

    for (let i = 1; i <= tenor; i++) {
      // Calculate due date: 20th of each month starting next month after disbursement
      const dueDate = new Date(disbursementDate)
      dueDate.setMonth(dueDate.getMonth() + i)
      dueDate.setDate(20) // Always 20th of the month
      dueDate.setHours(0, 0, 0, 0) // Set to midnight

      // Use last month values for the final installment
      const isLastMonth = i === tenor
      const principalAmount = isLastMonth
        ? lastMonthPrincipal
        : roundedMonthlyPrincipal
      const totalAmount = isLastMonth ? lastMonthPayment : monthlyPayment

      installments.push({
        loan_id: loan.id,
        installment_number: i,
        due_date: dueDate,
        principal_amount: principalAmount.toFixed(4),
        interest_amount: monthlyInterest.toFixed(4),
        penalty_amount: '0.0000',
        total_amount: totalAmount.toFixed(4),
        status: 'due',
        processed_by: processedBy
      })
    }

    return installments
  }

  /**
   * Process overdue installments - Called by scheduler on 21st of each month
   */
  async processOverdueInstallments(): Promise<void> {
    this.logger.log('Processing overdue installments...')

    // Get yesterday's date (20th if running on 21st)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)

    // Find all 'due' installments that are past their due date
    const overdueInstallments =
      await this.loansRepository.findOverdueInstallments(yesterday)

    this.logger.log(
      `Found ${overdueInstallments.length} overdue installments to process`
    )

    // Group installments by loan_id
    const installmentsByLoan = overdueInstallments.reduce(
      (acc, installment) => {
        if (!acc[installment.loan_id]) {
          acc[installment.loan_id] = []
        }
        acc[installment.loan_id].push(installment)
        return acc
      },
      {} as Record<string, any[]>
    )

    // Process each loan's overdue installments
    for (const [loanId, installments] of Object.entries(installmentsByLoan)) {
      await this.processLoanOverdueInstallments(loanId, installments)
    }

    this.logger.log('Overdue installments processing completed')
  }

  private async processLoanOverdueInstallments(
    loanId: string,
    overdueInstallments: any[]
  ): Promise<void> {
    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      const loan = await this.loansRepository.findById(loanId)
      if (!loan) {
        this.logger.warn(`Loan ${loanId} not found, skipping`)
        await trx.rollback()
        throw new NotFoundException(
          `Loan ${loanId} not found while processing overdue installments`
        )
      }

      // Calculate penalty amount (1% of principal)
      const penaltyAmount = new Decimal(loan.principal_amount)
        .mul(this.configService.get<number>('INTEREST_RATE', 0.01))
        .toNumber()

      // Get all installments for this loan sorted by installment number
      const allInstallments =
        await this.loansRepository.findInstallmentsByLoanId(loanId)

      allInstallments.sort(
        (a, b) => a.installment_number - b.installment_number
      )

      // Count consecutive overdue installments
      let consecutiveOverdueCount = 0
      for (const installment of allInstallments) {
        if (installment.status === 'due' || installment.status === 'overdue') {
          consecutiveOverdueCount++
        } else if (installment.status === 'paid') {
          consecutiveOverdueCount = 0 // Reset counter when paid installment found
        }
      }

      this.logger.log(
        `Loan ${loanId}: ${consecutiveOverdueCount} consecutive overdue installments, processing ${overdueInstallments.length} newly overdue`
      )

      // Mark all installments as overdue
      for (const installment of overdueInstallments) {
        await this.loansRepository.updateInstallmentStatus(
          installment.id,
          'overdue',
          trx
        )
        this.logger.log(
          `Marked installment ${installment.installment_number} of loan ${loanId} as overdue`
        )
      }

      // Apply ONE penalty per loan if there are 2+ consecutive overdue installments
      if (consecutiveOverdueCount >= 2) {
        // Apply penalty to the earliest overdue installment
        const earliestOverdue = overdueInstallments.sort(
          (a, b) => a.installment_number - b.installment_number
        )[0]

        await this.loansRepository.addPenaltyToInstallment(
          earliestOverdue.id,
          penaltyAmount,
          trx
        )
        this.logger.log(
          `Applied ONE penalty of ${penaltyAmount} to loan ${loanId} (${consecutiveOverdueCount} consecutive overdue installments)`
        )
      } else {
        this.logger.log(
          `No penalty for loan ${loanId} (only ${consecutiveOverdueCount} consecutive overdue)`
        )
      }

      await trx.commit()
      this.logger.log(`Processed overdue installments for loan ${loanId}`)
    } catch (error) {
      if (!trx.isCompleted()) {
        await trx.rollback()
      }
      this.logger.error(
        `Error processing overdue installments for loan ${loanId}:`,
        error
      )
      throw error
    }
  }

  private calculateLoanPayments(
    principalAmount: number,
    interestRate: number,
    tenor: number
  ) {
    const principal = new Decimal(principalAmount)
    const monthlyInterest = new Decimal(principalAmount)
      .mul(interestRate)
      .div(100)

    // Monthly payment = principal/tenor + monthly interest (before rounding)
    const monthlyPrincipal = principal.div(tenor)
    // const monthlyPayment = monthlyPrincipal.plus(monthlyInterest)

    const roundedMonthlyPrincipal = roundUpToNearest500Or1000(
      monthlyPrincipal.toNumber()
    )
    const monthlyPayment = new Decimal(roundedMonthlyPrincipal).plus(
      monthlyInterest
    )

    // Calculate last month's principal as remainder
    // This ensures total principal paid = original principal exactly
    const principalPaidInFirstMonths = roundedMonthlyPrincipal * (tenor - 1)
    const lastMonthPrincipal = principal.minus(principalPaidInFirstMonths)

    const lastMonthPayment = lastMonthPrincipal.plus(monthlyInterest)

    // Total payable = principal + (interest × tenor)
    // This ensures member pays exactly what they should
    const totalPayable =
      principal.toNumber() + monthlyInterest.toNumber() * tenor

    return {
      monthlyInterest: monthlyInterest.toNumber(),
      monthlyPayment: monthlyPayment.toNumber(),
      lastMonthPayment: lastMonthPayment.toNumber(),
      totalPayable
    }
  }
}

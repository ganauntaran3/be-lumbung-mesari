import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException
} from '@nestjs/common'
import Decimal from 'decimal.js'

import { DatabaseService } from '../database/database.service'

import { CreateLoanDto } from './dto/create-loan.dto'
import { ApproveLoanDto, RejectLoanDto } from './dto/loan-approval.dto'
import { LoansQueryDto } from './dto/loans-query.dto'
import { LoanPeriodTable, LoanWithUser } from './interface/loans.interface'
import { LoansRepository } from './loans.repository'
import { Installment } from './interface/installment.interface'
import { roundUpToNearest500Or1000 } from './utils'
import { CalculateLoanRequestDto } from './dto/calculate-loan.dto'

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name)

  constructor(
    private readonly loansRepository: LoansRepository,
    private readonly databaseService: DatabaseService
  ) {}

  private transformLoanPeriods(loanPeriods: LoanPeriodTable[]) {
    return loanPeriods.map((loanPeriod) => ({
      id: loanPeriod.id,
      tenor: loanPeriod.tenor,
      interest_rate: loanPeriod.interest_rate
    }))
  }

  async findAllPeriods() {
    const loanPeriods = await this.loansRepository.findAllLoanPeriods()
    return this.transformLoanPeriods(loanPeriods)
  }

  async createLoan(userId: string, createLoanDto: CreateLoanDto) {
    const { loanPeriodId, principalAmount, notes } = createLoanDto

    const loanPeriod =
      await this.loansRepository.findLoanPeriodById(loanPeriodId)

    if (!loanPeriod) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Loan period not found',
        error: 'Not Found'
      })
    }

    // Calculate loan details
    const principal = new Decimal(principalAmount)
    const interestRate = new Decimal(loanPeriod.interest_rate)
    const tenor = loanPeriod.tenor

    // Admin fee: 2% of principal
    const adminFee = principal.mul(0.02)
    const disbursedAmount = principal.minus(adminFee)

    // Monthly interest (in IDR)
    const monthlyInterest = principal.mul(interestRate).div(100)

    // Monthly payment = principal/tenor + monthly interest (before rounding)
    const monthlyPrincipal = principal.div(tenor)
    const monthlyPaymentBeforeRounding = monthlyPrincipal.plus(monthlyInterest)

    // Round monthly payment
    const roundedMonthlyPayment = roundUpToNearest500Or1000(
      monthlyPaymentBeforeRounding.toNumber()
    )

    // Calculate overpayment and last month payment
    const overpaymentPerMonth =
      roundedMonthlyPayment - monthlyPaymentBeforeRounding.toNumber()
    const totalOverpayment = overpaymentPerMonth * (tenor - 1)
    const lastMonthPaymentBeforeRounding =
      roundedMonthlyPayment - totalOverpayment
    const roundedLastMonthPayment = roundUpToNearest500Or1000(
      lastMonthPaymentBeforeRounding
    )

    // Total payable = (rounded monthly payment × (tenor - 1)) + last month payment
    const totalPayable =
      roundedMonthlyPayment * (tenor - 1) + roundedLastMonthPayment

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
      interest_amount: monthlyInterest.toNumber(),
      monthly_payment: roundedMonthlyPayment,
      last_month_payment: roundedLastMonthPayment,
      total_payable_amount: totalPayable,
      start_date: startDate,
      end_date: endDate,
      status: 'pending' as const,
      notes: notes || null
    }

    const loan = await this.loansRepository.createLoan(loanData)

    this.logger.log(`Loan created for user ${userId}: ${loan.id}`)

    return loan
  }

  async calculateLoan(calculateDto: CalculateLoanRequestDto) {
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
    const adminFee = loanAmount.mul(0.02)
    const disbursedAmount = loanAmount.minus(adminFee)

    // Monthly interest (in IDR)
    const monthlyInterest = loanAmount.mul(interestRate).div(100)

    // Monthly payment = principal/tenor + monthly interest (before rounding)
    const monthlyPrincipal = loanAmount.div(tenor)
    const monthlyPaymentBeforeRounding = monthlyPrincipal.plus(monthlyInterest)

    // Round monthly payment
    const roundedMonthlyPayment = roundUpToNearest500Or1000(
      monthlyPaymentBeforeRounding.toNumber()
    )

    // Calculate overpayment and last month payment
    const overpaymentPerMonth =
      roundedMonthlyPayment - monthlyPaymentBeforeRounding.toNumber()
    const totalOverpayment = overpaymentPerMonth * (tenor - 1)
    const lastMonthPaymentBeforeRounding =
      roundedMonthlyPayment - totalOverpayment
    const roundedLastMonthPayment = roundUpToNearest500Or1000(
      lastMonthPaymentBeforeRounding
    )

    return {
      loanAmount: loanAmount.toNumber(),
      adminFee: adminFee.toNumber(),
      disbursedAmount: disbursedAmount.toNumber(),
      tenor,
      interestRate: interestRate.toNumber(),
      monthlyInterest: monthlyInterest.toNumber(),
      monthlyPayment: roundedMonthlyPayment,
      lastMonthlyPayment: roundedLastMonthPayment
    }

    // Only include lastMonthlyPayment if it's different from monthlyPayment
    // if (roundedLastMonthPayment !== roundedMonthlyPayment) {
    //   response.lastMonthlyPayment = roundedLastMonthPayment
    // }
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

  async approveLoan(
    loanId: string,
    approvalDto: ApproveLoanDto,
    adminId: string
  ) {
    const loan = await this.loansRepository.findById(loanId)

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
      approvalDto.notes || null
    )

    this.logger.log(`Loan ${loanId} approved by admin ${adminId}`)

    return {
      message: 'Loan approved successfully',
      status: 'approved',
      loanId
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
    const loan = await this.loansRepository.findById(loanId)

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
      rejectDto.reason
    )

    this.logger.log(`Loan ${loanId} rejected by admin ${adminId}`)

    return {
      message: 'Loan rejected successfully',
      status: 'rejected',
      loanId
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
    const monthlyPrincipal = new Decimal(loan.principal_amount).div(tenor)
    const monthlyInterest = new Decimal(loan.interest_amount)

    for (let i = 1; i <= tenor; i++) {
      const dueDate = new Date(loan.start_date)
      dueDate.setMonth(dueDate.getMonth() + i)

      // Use last month payment for the final installment
      const totalAmount = i === tenor ? lastMonthPayment : monthlyPayment

      installments.push({
        loan_id: loan.id,
        installment_number: i,
        due_date: dueDate,
        principal_amount: monthlyPrincipal.toFixed(4),
        interest_amount: monthlyInterest.toFixed(4),
        penalty_amount: '0.0000',
        total_amount: totalAmount.toFixed(4),
        status: 'due',
        processed_by: processedBy
      })
    }

    return installments
  }
}

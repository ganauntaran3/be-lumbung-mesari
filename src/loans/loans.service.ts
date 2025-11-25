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
import { Installment, LoanWithUser } from './interface/loans.interface'
import { LoansRepository } from './loans.repository'

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name)

  constructor(
    private readonly loansRepository: LoansRepository,
    private readonly databaseService: DatabaseService
  ) {}

  async createLoan(userId: string, createLoanDto: CreateLoanDto) {
    const { loanPeriodId, principalAmount, notes } = createLoanDto

    // Verify loan period exists
    const loanPeriod =
      await this.loansRepository.findLoanPeriodById(loanPeriodId)
    if (!loanPeriod) {
      throw new NotFoundException('Loan period not found')
    }

    // Calculate loan details
    const principal = new Decimal(principalAmount)
    const interestRate = new Decimal(loanPeriod.interest_rate)
    const tenor = loanPeriod.tenor

    // Admin fee: 1% of principal
    const adminFee = principal.mul(0.01)
    const disbursedAmount = principal.minus(adminFee)

    // Monthly interest
    const monthlyInterest = principal.mul(interestRate).div(100)

    // Monthly payment = principal/tenor + monthly interest
    const monthlyPayment = principal.div(tenor).plus(monthlyInterest)

    // Total payable = monthly payment * tenor
    const totalPayable = monthlyPayment.mul(tenor)

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
      monthly_payment: monthlyPayment.toNumber(),
      total_payable_amount: totalPayable.toNumber(),
      start_date: startDate,
      end_date: endDate,
      status: 'pending' as const,
      notes: notes || null
    }

    const loan = await this.loansRepository.createLoan(loanData)

    this.logger.log(`Loan created for user ${userId}: ${loan.id}`)

    return loan
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
      throw new NotFoundException('Loan not found')
    }

    if (loan.status !== 'pending') {
      throw new BadRequestException(
        `Cannot approve loan with status: ${loan.status}`
      )
    }

    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      this.logger.log(`Starting loan approval for loan ${loanId}`)

      // Update loan status to approved
      await this.loansRepository.updateLoanStatus(
        loanId,
        'approved',
        adminId,
        approvalDto.notes || null,
        trx
      )

      // Generate installments
      const installments = this.generateInstallments(loan, adminId)
      await this.loansRepository.createInstallments(installments, trx)

      await trx.commit()
      this.logger.log(`Loan ${loanId} approved successfully`)

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

  private generateInstallments(
    loan: LoanWithUser,
    processedBy: string
  ): Partial<Installment>[] {
    const installments: Partial<Installment>[] = []
    const tenor = loan.tenor
    const monthlyPrincipal = new Decimal(loan.principal_amount).div(tenor)
    const monthlyInterest = new Decimal(loan.interest_amount)
    const monthlyPayment = new Decimal(loan.monthly_payment)

    for (let i = 1; i <= tenor; i++) {
      const dueDate = new Date(loan.start_date)
      dueDate.setMonth(dueDate.getMonth() + i)

      installments.push({
        loan_id: loan.id,
        installment_number: i,
        due_date: dueDate,
        principal_amount: monthlyPrincipal.toFixed(4),
        interest_amount: monthlyInterest.toFixed(4),
        penalty_amount: '0.0000',
        total_amount: monthlyPayment.toFixed(4),
        status: 'due',
        processed_by: processedBy
      })
    }

    return installments
  }
}

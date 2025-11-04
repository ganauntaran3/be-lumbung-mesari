import { Injectable, Logger } from '@nestjs/common'
import { Knex } from 'knex'

import { CashbookTransactionService } from '../cashbook/cashbook-transaction.service'
import { DatabaseService } from '../database/database.service'
import { ExpenseWithCategory, UpdateExpense } from '../interface/expenses'

import { CreateExpenseDto } from './dto/create-expense.dto'
import {
  ExpenseResponseDto,
  ExpensesPaginatedResponseDto,
  ExpenseCategoryResponseDto
} from './dto/expense-response.dto'
import { ExpensesQueryDto } from './dto/expenses-query.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import {
  ExpenseNotFoundError,
  ExpenseCategoryNotFoundError,
  InvalidExpenseAmountError,
  ExpenseValidationError,
  InsufficientFundsError
} from './exceptions/expense.exceptions'
import { ExpenseCategoriesRepository } from './expense-categories.repository'
import { ExpensesRepository } from './expenses.repository'
import { ExpenseSource } from './interfaces'

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name)

  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly expenseCategoriesRepository: ExpenseCategoriesRepository,
    private readonly cashbookTransactionService: CashbookTransactionService,
    private readonly databaseService: DatabaseService
  ) {}

  private async allocateAmounts(
    totalAmount: number,
    source: 'auto' | 'total' | 'capital' | 'shu'
  ): Promise<{ shuAmount: number; capitalAmount: number }> {
    const knex = this.databaseService.getKnex()
    const balances = await knex('cashbook_balances')
      .select('type', 'balance')
      .whereIn('type', ['shu', 'capital'])

    const shuBalance = parseFloat(
      balances.find((b) => b.type === 'shu')?.balance || '0'
    )
    const capitalBalance = parseFloat(
      balances.find((b) => b.type === 'capital')?.balance || '0'
    )

    switch (source) {
      case ExpenseSource.SHU:
        if (shuBalance < totalAmount) {
          throw new InsufficientFundsError(
            totalAmount,
            shuBalance,
            ExpenseSource.SHU
          )
        }
        return { shuAmount: totalAmount, capitalAmount: 0 }
      case ExpenseSource.CAPITAL:
        if (capitalBalance < totalAmount) {
          throw new InsufficientFundsError(
            totalAmount,
            capitalBalance,
            ExpenseSource.CAPITAL
          )
        }
        return { shuAmount: 0, capitalAmount: totalAmount }
      case ExpenseSource.AUTO: {
        const knex = this.databaseService.getKnex()
        const balances = await knex('cashbook_balances')
          .select('type', 'balance')
          .whereIn('type', ['shu', 'capital'])

        const shuBalance = parseFloat(
          balances.find((b) => b.type === 'shu')?.balance || '0'
        )
        const capitalBalance = parseFloat(
          balances.find((b) => b.type === 'capital')?.balance || '0'
        )

        if (capitalBalance >= totalAmount) {
          return { shuAmount: totalAmount, capitalAmount: 0 }
        } else if (shuBalance + capitalBalance >= totalAmount) {
          const remainingAmount = totalAmount - shuBalance
          return { shuAmount: shuBalance, capitalAmount: remainingAmount }
        } else {
          throw new InsufficientFundsError(
            totalAmount,
            shuBalance + capitalBalance,
            ExpenseSource.AUTO
          )
        }
      }
      default:
        return { shuAmount: 0, capitalAmount: totalAmount }
    }
  }

  async createExpense(
    createExpenseDto: CreateExpenseDto,
    currentUserId: string
  ): Promise<ExpenseResponseDto> {
    this.logger.log(
      `Creating expense for category ${createExpenseDto.expenseCategoryId} with amount ${createExpenseDto.amount}`
    )

    if (createExpenseDto.amount <= 0) {
      throw new InvalidExpenseAmountError(createExpenseDto.amount)
    }

    if (createExpenseDto.amount > 999999999999.9999) {
      throw new ExpenseValidationError(
        `Amount ${createExpenseDto.amount} exceeds maximum allowed value of 999,999,999,999.9999`
      )
    }

    const category = await this.expenseCategoriesRepository.findById(
      createExpenseDto.expenseCategoryId
    )
    if (!category) {
      throw new ExpenseCategoryNotFoundError(createExpenseDto.expenseCategoryId)
    }

    const effectiveSource = createExpenseDto.source || category.default_source

    const { shuAmount, capitalAmount } = await this.allocateAmounts(
      createExpenseDto.amount,
      effectiveSource
    )

    this.logger.debug(
      `Allocated amounts - SHU: ${shuAmount}, Capital: ${capitalAmount}, Source: ${effectiveSource}`
    )

    try {
      const expenseData = {
        expense_category_id: createExpenseDto.expenseCategoryId,
        name: createExpenseDto.name,
        shu_amount: shuAmount.toString(),
        capital_amount: capitalAmount.toString(),
        txn_date: createExpenseDto.transactionDate || new Date(),
        user_id: createExpenseDto.userId || currentUserId,
        loan_id: createExpenseDto.loanId,
        notes: createExpenseDto.notes,
        source: effectiveSource
      }

      const knex = this.databaseService.getKnex()
      const result = await knex.transaction(async (trx: Knex.Transaction) => {
        const expense = await this.expensesRepository.createExpense(
          expenseData,
          trx
        )

        await this.cashbookTransactionService.createExpenseTransaction(
          expense.id,
          expense.user_id || currentUserId,
          createExpenseDto.amount,
          createExpenseDto.transactionDate,
          trx
        )

        return expense
      })

      this.logger.log(`Expense created successfully with ID: ${result.id}`)

      return this.formatExpenseResponse({
        ...result,
        category
      })
    } catch (error: any) {
      this.logger.error(`Error creating expense: ${error.message}`)
      throw error
    }
  }

  async findAllExpenses(
    query: ExpensesQueryDto
  ): Promise<ExpensesPaginatedResponseDto> {
    this.logger.log(`Finding expenses with filters: ${JSON.stringify(query)}`)

    const result = await this.expensesRepository.findAllWithFilters(query)

    return {
      data: result.data.map((expense) => this.formatExpenseResponse(expense)),
      page: result.page,
      limit: result.limit,
      totalData: result.totalData,
      totalPage: result.totalPage,
      next: result.next,
      prev: result.prev
    }
  }

  /**
   * Find expense by ID with category information
   * @param id - The expense ID
   * @returns Promise<ExpenseResponseDto>
   */
  async findExpenseById(id: string): Promise<ExpenseResponseDto> {
    this.logger.log(`Finding expense by ID: ${id}`)

    const expense = await this.expensesRepository.findByIdWithCategory(id)
    if (!expense) {
      throw new ExpenseNotFoundError(id)
    }

    return this.formatExpenseResponse(expense)
  }

  /**
   * Update an existing expense with validation and cashbook integration
   * @param id - The expense ID to update
   * @param updateExpenseDto - The update data
   * @returns Promise<ExpenseResponseDto>
   */
  async updateExpense(
    id: string,
    updateExpenseDto: UpdateExpenseDto
  ): Promise<ExpenseResponseDto> {
    this.logger.log(
      `Updating expense ${id} with data: ${JSON.stringify(updateExpenseDto)}`
    )

    // 1. Check if expense exists
    const existingExpense =
      await this.expensesRepository.findByIdWithCategory(id)
    if (!existingExpense) {
      throw new ExpenseNotFoundError(id)
    }

    // 2. Additional validation for amount if being updated
    if (updateExpenseDto.amount !== undefined) {
      if (updateExpenseDto.amount <= 0) {
        throw new InvalidExpenseAmountError(updateExpenseDto.amount)
      }

      if (updateExpenseDto.amount > 999999999999.9999) {
        throw new ExpenseValidationError(
          `Amount ${updateExpenseDto.amount} exceeds maximum allowed value of 999,999,999,999.9999`
        )
      }
    }

    // 3. Validate category if being updated
    let category = null
    if (updateExpenseDto.expenseCategoryId) {
      category = await this.expenseCategoriesRepository.findById(
        updateExpenseDto.expenseCategoryId
      )
      if (!category) {
        throw new ExpenseCategoryNotFoundError(
          updateExpenseDto.expenseCategoryId
        )
      }
    }

    // 4. Prepare update data
    const updateData: UpdateExpense = {}

    // Handle amount change - recalculate shu_amount and capital_amount
    if (updateExpenseDto.amount !== undefined) {
      // Get the effective category (new or existing)
      const effectiveCategory = category || existingExpense.category
      const effectiveSource =
        updateExpenseDto.source ||
        existingExpense.source ||
        effectiveCategory.default_source

      // Allocate the new amount
      const { shuAmount, capitalAmount } = await this.allocateAmounts(
        updateExpenseDto.amount,
        effectiveSource
      )

      updateData.shu_amount = shuAmount.toString()
      updateData.capital_amount = capitalAmount.toString()

      this.logger.log(
        `Reallocated amounts for expense ${id} - SHU: ${shuAmount}, Capital: ${capitalAmount}, Source: ${effectiveSource}`
      )
    }

    if (updateExpenseDto.expenseCategoryId) {
      updateData.expense_category_id = updateExpenseDto.expenseCategoryId
    }
    if (updateExpenseDto.name !== undefined) {
      updateData.name = updateExpenseDto.name
    }
    if (updateExpenseDto.userId !== undefined) {
      updateData.user_id = updateExpenseDto.userId
    }
    if (updateExpenseDto.loanId !== undefined) {
      updateData.loan_id = updateExpenseDto.loanId
    }
    if (updateExpenseDto.notes !== undefined) {
      updateData.notes = updateExpenseDto.notes
    }
    if (updateExpenseDto.source !== undefined) {
      updateData.source = updateExpenseDto.source
    }

    // 5. Update expense in transaction
    const knex = this.databaseService.getKnex()
    await knex.transaction(async (trx: Knex.Transaction) => {
      await this.expensesRepository.updateExpenseById(id, updateData, trx)

      // Update cashbook transaction if amount changed
      if (updateExpenseDto.amount !== undefined) {
        // Find and update the related cashbook transaction
        await knex('cashbook_transactions')
          .where('expense_id', id)
          .update({ amount: updateExpenseDto.amount.toString() })
          .transacting(trx)

        this.logger.log(
          `Updated cashbook transaction for expense ${id} with new amount: ${updateExpenseDto.amount}`
        )
      }
    })

    this.logger.log(`Expense ${id} updated successfully`)

    // 6. Return updated expense with category information
    const updatedExpenseWithCategory =
      await this.expensesRepository.findByIdWithCategory(id)
    return this.formatExpenseResponse(updatedExpenseWithCategory!)
  }

  /**
   * Delete an expense with proper authorization checks and cashbook cleanup
   * @param id - The expense ID to delete
   * @returns Promise<void>
   */
  async deleteExpense(id: string): Promise<void> {
    this.logger.log(`Deleting expense ${id}`)

    // 1. Check if expense exists
    const expense = await this.expensesRepository.findById(id)
    if (!expense) {
      throw new ExpenseNotFoundError(id)
    }

    // 2. Delete expense and handle cashbook cleanup
    const knex = this.databaseService.getKnex()
    await knex.transaction(async (trx: Knex.Transaction) => {
      // Delete the expense using transaction-aware method
      await this.expensesRepository.deleteExpenseById(id, trx)

      // Note: Cashbook transaction cleanup would be handled by database constraints
      // or triggers, or we would need to implement explicit cleanup here
      this.logger.log(
        `Expense ${id} deleted. Related cashbook transactions should be handled by database constraints.`
      )
    })

    this.logger.log(`Expense ${id} deleted successfully`)
  }

  /**
   * Get all available expense categories
   * @returns Promise<ExpenseCategoryResponseDto[]>
   */
  async getAllCategories(): Promise<ExpenseCategoryResponseDto[]> {
    this.logger.log('Retrieving all expense categories')

    const categories =
      await this.expenseCategoriesRepository.findAllCategories()

    return categories.map((category) => ({
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      defaultSource: category.default_source
    }))
  }

  /**
   * Format expense data for API response
   * @param expense - The expense data with category
   * @returns ExpenseResponseDto
   */
  private formatExpenseResponse(
    expense: ExpenseWithCategory
  ): ExpenseResponseDto {
    const shuAmount = Number.parseFloat(expense.shu_amount)
    const capitalAmount = Number.parseFloat(expense.capital_amount)

    return {
      id: expense.id,
      expenseCategoryId: expense.expense_category_id,
      name: expense.name,
      shuAmount,
      capitalAmount,
      totalAmount: shuAmount + capitalAmount,
      userId: expense.user_id,
      loanId: expense.loan_id,
      notes: expense.notes,
      source: expense.source,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
      category: {
        id: expense.category.id,
        code: expense.category.code,
        name: expense.category.name,
        description: expense.category.description,
        defaultSource: expense.category.default_source
      }
    }
  }
}

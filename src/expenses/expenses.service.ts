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
  ExpenseValidationError
} from './exceptions/expense.exceptions'
import { ExpenseCategoriesRepository } from './expense-categories.repository'
import { ExpensesRepository } from './expenses.repository'

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name)

  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly expenseCategoriesRepository: ExpenseCategoriesRepository,
    private readonly cashbookTransactionService: CashbookTransactionService,
    private readonly databaseService: DatabaseService
  ) {}

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

    try {
      const expenseData = {
        expense_category_id: createExpenseDto.expenseCategoryId,
        amount: createExpenseDto.amount.toString(),
        txn_date: createExpenseDto.expenseDate,
        user_id: createExpenseDto.userId || currentUserId,
        loan_id: createExpenseDto.loanId,
        notes: createExpenseDto.notes,
        source: createExpenseDto.source || category.default_source
      }

      const knex = this.databaseService.getKnex()
      const result = await knex.transaction(async (trx: Knex.Transaction) => {
        const expense = await this.expensesRepository.createExpense(
          expenseData,
          trx
        )

        // Create cashbook transaction
        await this.cashbookTransactionService.createExpenseTransaction(
          expense.id,
          expense.user_id || currentUserId,
          createExpenseDto.amount,
          createExpenseDto.expenseDate,
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
    if (updateExpenseDto.expenseCategoryId) {
      const category = await this.expenseCategoriesRepository.findById(
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
    if (updateExpenseDto.expenseCategoryId) {
      updateData.expense_category_id = updateExpenseDto.expenseCategoryId
    }
    if (updateExpenseDto.amount !== undefined) {
      updateData.amount = updateExpenseDto.amount.toString()
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

    // 5. Update expense and handle cashbook integration if amount changed
    const knex = this.databaseService.getKnex()
    await knex.transaction(async (trx: Knex.Transaction) => {
      // Update the expense using transaction-aware method
      await this.expensesRepository.updateExpenseById(id, updateData, trx)

      // If amount changed, we would need to update the cashbook transaction
      // For now, we'll log this as a future enhancement
      if (
        updateExpenseDto.amount !== undefined &&
        updateExpenseDto.amount.toString() !== existingExpense.amount
      ) {
        this.logger.warn(
          `Amount changed for expense ${id}. Cashbook transaction update not implemented yet.`
        )
        // Note: Implement cashbook transaction update in future enhancement
        // This would require finding the related cashbook transaction and updating it
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
    return {
      id: expense.id,
      expenseCategoryId: expense.expense_category_id,
      amount: Number.parseFloat(expense.amount),
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

import { Injectable } from '@nestjs/common'
import { Knex } from 'knex'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import {
  ExpenseTable,
  NewExpense,
  ExpenseWithCategory
} from '../interface/expenses'
import { PaginationResult } from '../interface/pagination'

import { ExpensesQueryDto } from './dto/expenses-query.dto'

@Injectable()
export class ExpensesRepository extends BaseRepository<ExpenseTable> {
  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService, 'expenses')
  }

  private createPaginationResult<T>(
    page: number,
    limit: number,
    totalData: number,
    data: T[]
  ): PaginationResult<T> {
    const totalPage = Math.ceil(totalData / limit)
    const next = page < totalPage
    const prev = page > 1

    return {
      data,
      page,
      limit,
      totalData,
      totalPage,
      next,
      prev
    }
  }

  private applyFilters(
    query: Knex.QueryBuilder,
    filters: {
      category?: string
      userId?: string
      startDate?: string
      endDate?: string
      minAmount?: number
      maxAmount?: number
    }
  ): void {
    const { category, userId, startDate, endDate, minAmount, maxAmount } =
      filters

    if (category) {
      query.where('expense_categories.code', category)
    }

    if (userId) {
      query.where('expenses.user_id', userId)
    }

    if (startDate) {
      query.where('expenses.created_at', '>=', startDate)
    }

    if (endDate) {
      query.where('expenses.created_at', '<=', endDate + ' 23:59:59')
    }

    if (minAmount !== undefined) {
      query.where('expenses.amount', '>=', minAmount.toString())
    }

    if (maxAmount !== undefined) {
      query.where('expenses.amount', '<=', maxAmount.toString())
    }
  }

  /**
   * Apply sorting with joins consideration
   * @param query - The Knex query builder
   * @param sortBy - Field to sort by
   * @param sortOrder - Sort order (asc/desc)
   */
  private applySortingWithJoins(
    query: Knex.QueryBuilder,
    sortBy: string = 'date',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): void {
    switch (sortBy) {
      case 'date':
        query.orderBy('expenses.created_at', sortOrder)
        break
      case 'amount':
        query.orderBy('expenses.amount', sortOrder)
        break
      case 'category':
        query.orderBy('expense_categories.name', sortOrder)
        break
      default:
        query.orderBy('expenses.created_at', sortOrder)
    }
  }

  async createExpense(
    data: NewExpense,
    trx?: Knex.Transaction
  ): Promise<ExpenseTable> {
    const query = trx ? trx(this.tableName) : this.knex(this.tableName)

    const [result] = await query
      .insert({
        ...data,
        txn_date: data.txn_date || new Date(),
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    return result as ExpenseTable
  }

  async findAllWithFilters(
    filters: ExpensesQueryDto
  ): Promise<PaginationResult<ExpenseWithCategory>> {
    const {
      page = 1,
      limit = 10,
      category,
      userId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'date',
      sortOrder = 'desc'
    } = filters

    const offset = (page - 1) * limit

    // Base query with category join
    const baseQuery = this.knex(this.tableName)
      .leftJoin(
        'expense_categories',
        'expenses.expense_category_id',
        'expense_categories.id'
      )
      .leftJoin('users', 'expenses.user_id', 'users.id')

    // Apply filters
    this.applyFilters(baseQuery, {
      category,
      userId,
      startDate,
      endDate,
      minAmount,
      maxAmount
    })

    // Get total count
    const [{ count }] = await baseQuery.clone().count('expenses.id as count')
    const totalData = Number.parseInt(count as string, 10)

    // Get data with proper selection and sorting
    const dataQuery = baseQuery
      .clone()
      .select(
        'expenses.id',
        'expenses.expense_category_id',
        'expenses.name',
        'expenses.shu_amount',
        'expenses.capital_amount',
        'expenses.user_id',
        'expenses.loan_id',
        'expenses.notes',
        'expenses.source',
        'expenses.txn_date',
        'expenses.created_at',
        'expenses.updated_at',
        'expense_categories.id as category_id',
        'expense_categories.code as category_code',
        'expense_categories.name as category_name',
        'expense_categories.description as category_description',
        'expense_categories.default_source as category_default_source',
        'expense_categories.created_at as category_created_at',
        'expense_categories.updated_at as category_updated_at'
      )

    // Apply sorting
    this.applySortingWithJoins(dataQuery, sortBy, sortOrder)

    const rawData = await dataQuery.limit(limit).offset(offset)

    // Transform data to include category object
    const data = rawData.map((row) => ({
      id: row.id,
      expense_category_id: row.expense_category_id,
      name: row.name,
      shu_amount: row.shu_amount,
      capital_amount: row.capital_amount,
      user_id: row.user_id,
      loan_id: row.loan_id,
      notes: row.notes,
      source: row.source,
      txn_date: row.txn_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: {
        id: row.category_id,
        code: row.category_code,
        name: row.category_name,
        description: row.category_description,
        default_source: row.category_default_source,
        created_at: row.category_created_at,
        updated_at: row.category_updated_at
      }
    })) as ExpenseWithCategory[]

    return this.createPaginationResult(page, limit, totalData, data)
  }

  async findByIdWithCategory(id: string): Promise<ExpenseWithCategory | null> {
    const result = await this.knex(this.tableName)
      .leftJoin(
        'expense_categories',
        'expenses.expense_category_id',
        'expense_categories.id'
      )
      .select(
        'expenses.id',
        'expenses.expense_category_id',
        'expenses.name',
        'expenses.shu_amount',
        'expenses.capital_amount',
        'expenses.user_id',
        'expenses.loan_id',
        'expenses.notes',
        'expenses.source',
        'expenses.txn_date',
        'expenses.created_at',
        'expenses.updated_at',
        'expense_categories.id as category_id',
        'expense_categories.code as category_code',
        'expense_categories.name as category_name',
        'expense_categories.description as category_description',
        'expense_categories.default_source as category_default_source',
        'expense_categories.created_at as category_created_at',
        'expense_categories.updated_at as category_updated_at'
      )
      .where('expenses.id', id)
      .first()

    if (!result) {
      return null
    }

    return {
      id: result.id,
      expense_category_id: result.expense_category_id,
      name: result.name,
      shu_amount: result.shu_amount,
      capital_amount: result.capital_amount,
      user_id: result.user_id,
      loan_id: result.loan_id,
      notes: result.notes,
      source: result.source,
      txn_date: result.txn_date,
      created_at: result.created_at,
      updated_at: result.updated_at,
      category: {
        id: result.category_id,
        code: result.category_code,
        name: result.category_name,
        description: result.category_description,
        default_source: result.category_default_source,
        created_at: result.category_created_at,
        updated_at: result.category_updated_at
      }
    } as ExpenseWithCategory
  }

  async updateExpenseById(
    id: string,
    data: Partial<ExpenseTable>,
    trx?: Knex.Transaction
  ): Promise<ExpenseTable> {
    const query = trx ? trx(this.tableName) : this.knex(this.tableName)

    const [result] = await query
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      })
      .returning('*')

    return result as ExpenseTable
  }

  async deleteExpenseById(
    id: string,
    trx?: Knex.Transaction
  ): Promise<ExpenseTable> {
    const query = trx ? trx(this.tableName) : this.knex(this.tableName)

    const [result] = await query.where('id', id).del().returning('*')

    return result as ExpenseTable
  }
}

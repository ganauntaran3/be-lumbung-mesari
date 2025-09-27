import { Knex } from 'knex'
import { DatabaseService } from './database.service'
import {
  PaginationOptions,
  PaginationResult,
  PAGINATION_DEFAULTS
} from '../interface/pagination'

/**
 * Generic base repository class that provides common CRUD operations
 * Uses a generic approach with Knex query builder
 * - T: The entity type (e.g., User)
 */
export abstract class BaseRepository<T> {
  protected readonly knex: Knex

  constructor(
    protected readonly databaseService: DatabaseService,
    protected readonly tableName: string
  ) {
    this.knex = databaseService.getKnex()
  }

  async findAll(): Promise<T[]> {
    const result = await this.knex(this.tableName).select()

    return result as T[]
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | undefined> {
    const result = await this.knex(this.tableName).where('id', id).first()

    return result as T | undefined
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const [result] = await this.knex(this.tableName).insert(data).returning('*')

    return result as T
  }

  /**
   * Update a record by ID
   */
  async updateById(id: string, data: Partial<T>): Promise<T> {
    const [result] = await this.knex(this.tableName)
      .where('id', id)
      .update(data)
      .returning('*')

    return result as T
  }

  /**
   * Delete a record by ID
   */
  async deleteById(id: string): Promise<T> {
    const [result] = await this.knex(this.tableName)
      .where('id', id)
      .del()
      .returning('*')

    return result as T
  }

  /**
   * Get paginated results with enhanced functionality
   */
  async paginate(options: PaginationOptions = {}): Promise<PaginationResult<T>> {
    const {
      page = PAGINATION_DEFAULTS.page,
      limit = PAGINATION_DEFAULTS.limit,
      sortBy = PAGINATION_DEFAULTS.sortBy,
      sortOrder = PAGINATION_DEFAULTS.sortOrder,
    } = options

    const offset = (page - 1) * limit

    // Build base query
    const baseQuery = this.knex(this.tableName)

    // Get total count
    const [{ count }] = await baseQuery.clone().count('* as count')
    const totalData = parseInt(count as string, 10)

    // Get paginated data with sorting
    const dataQuery = baseQuery.clone().select('*')
    this.applySorting(dataQuery, sortBy, sortOrder)
    const data = await dataQuery.limit(limit).offset(offset)

    // Calculate pagination metadata
    const totalPage = Math.ceil(totalData / limit)
    const next = page < totalPage
    const prev = page > 1

    return {
      data: data as T[],
      page,
      limit,
      totalData,
      totalPage,
      next,
      prev,
    }
  }

  /**
   * Helper method to create pagination metadata
   */
  protected createPaginationMetadata(
    page: number,
    limit: number,
    totalData: number
  ) {
    const totalPage = Math.ceil(totalData / limit)
    const next = page < totalPage
    const prev = page > 1

    return {
      page,
      limit,
      totalData,
      totalPage,
      next,
      prev,
    }
  }

  /**
   * Apply sorting to a query builder
   */
  protected applySorting(
    query: Knex.QueryBuilder,
    sortBy: string = PAGINATION_DEFAULTS.sortBy,
    sortOrder: 'asc' | 'desc' = PAGINATION_DEFAULTS.sortOrder
  ): Knex.QueryBuilder {
    // Validate sortBy to prevent SQL injection
    // Only allow alphanumeric characters, underscores, and dots (for table.column)
    if (!/^[a-zA-Z0-9_.]+$/.test(sortBy)) {
      sortBy = PAGINATION_DEFAULTS.sortBy
    }

    return query.orderBy(sortBy, sortOrder)
  }
}

import { Knex } from 'knex'
import { DatabaseService } from './database.service'

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
   * Get paginated results
   */
  async paginate(
    page = 1,
    perPage = 10
  ): Promise<{ data: T[]; page: number; total: number; totalPage: number }> {
    const offset = (page - 1) * perPage

    // Get paginated data
    const data = await this.knex(this.tableName)
      .select('*')
      .limit(perPage)
      .offset(offset)

    // Get total count
    const [{ count }] = await this.knex(this.tableName).count('* as count')

    const total = parseInt(count as string, 10)
    const totalPage = Math.ceil(total / perPage)

    return {
      data: data as T[],
      page,
      total,
      totalPage
    }
  }
}

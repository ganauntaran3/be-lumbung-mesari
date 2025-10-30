import { Knex } from 'knex'

import {
  PaginationOptions,
  PaginationResult,
  PAGINATION_DEFAULTS
} from '../interface/pagination'

import { DatabaseService } from './database.service'

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

  async findById(id: string): Promise<T | undefined> {
    const result = await this.knex(this.tableName).where('id', id).first()

    return result as T | undefined
  }

  async create(data: Partial<T>): Promise<T> {
    const [result] = await this.knex(this.tableName).insert(data).returning('*')

    return result as T
  }

  async updateById(id: string, data: Partial<T>): Promise<T> {
    const [result] = await this.knex(this.tableName)
      .where('id', id)
      .update(data)
      .returning('*')

    return result as T
  }

  async deleteById(id: string): Promise<T> {
    const [result] = await this.knex(this.tableName)
      .where('id', id)
      .del()
      .returning('*')

    return result as T
  }

  async paginate(
    options: PaginationOptions = {}
  ): Promise<PaginationResult<T>> {
    const {
      page = PAGINATION_DEFAULTS.page,
      limit = PAGINATION_DEFAULTS.limit,
      sortBy = PAGINATION_DEFAULTS.sortBy,
      sortOrder = PAGINATION_DEFAULTS.sortOrder
    } = options

    const offset = (page - 1) * limit

    const baseQuery = this.knex(this.tableName)

    const [{ count }] = await baseQuery.clone().count('* as count')
    const totalData = Number.parseInt(count as string, 10)

    const dataQuery = baseQuery.clone().select('*')
    this.applySorting(dataQuery, sortBy, sortOrder)
    const data = await dataQuery.limit(limit).offset(offset)

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
      prev
    }
  }

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
      prev
    }
  }

  protected applySorting(
    query: Knex.QueryBuilder,
    sortBy: string = PAGINATION_DEFAULTS.sortBy,
    sortOrder: 'asc' | 'desc' = PAGINATION_DEFAULTS.sortOrder
  ): Knex.QueryBuilder {
    if (!/^[a-zA-Z0-9_.]+$/.test(sortBy)) {
      sortBy = PAGINATION_DEFAULTS.sortBy
    }

    return query.orderBy(sortBy, sortOrder)
  }
}

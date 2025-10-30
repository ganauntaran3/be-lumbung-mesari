import { Injectable, Logger } from '@nestjs/common'
import { Knex } from 'knex'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import { PaginationOptions, PaginationResult } from '../interface/pagination'

import { UpdateUserEntity, User } from './interface/users'

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  private readonly logger = new Logger(UsersRepository.name)

  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService, 'users')
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.knex('users').where('email', email).first()

    return result as User | undefined
  }

  async findByEmailWithRole(
    email: string
  ): Promise<(User & { role_name: string }) | undefined> {
    const result = await this.knex('users')
      .join('roles', 'roles.id', 'users.role_id')
      .select([
        'users.id',
        'users.email',
        'users.fullname',
        'users.username',
        'users.password',
        'users.phone_number',
        'users.address',
        'users.status',
        'users.role_id',
        'users.deposit_image_url',
        'users.otp_code',
        'users.otp_expires_at',
        'users.otp_verified',
        'users.created_at',
        'users.updated_at',
        'roles.id as role'
      ])
      .where('users.email', email)
      .first()

    return result as (User & { role_name: string }) | undefined
  }

  async findByIdentifierWithRole(
    identifier: string
  ): Promise<User | undefined> {
    const result = await this.knex('users')
      .join('roles', 'roles.id', 'users.role_id')
      .select([
        'users.id',
        'users.email',
        'users.fullname',
        'users.username',
        'users.password',
        'users.phone_number',
        'users.address',
        'users.status',
        'users.role_id',
        'users.deposit_image_url',
        'users.otp_code',
        'users.otp_expires_at',
        'users.otp_verified',
        'users.created_at',
        'users.updated_at'
      ])
      .where('users.email', identifier)
      .orWhere('users.username', identifier)
      .first()

    return result
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const result = await this.knex('users').where('username', username).first()

    return result
  }

  async findAllWithRoles(
    options: PaginationOptions & {
      role?: string
      status?: string
      search?: string
    } = {}
  ): Promise<PaginationResult<User>> {
    const {
      role,
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options
    try {
      const offset = (page - 1) * limit

      let query = this.knex('users')

      if (role) {
        query = query.where('roles.id', role)
      }

      if (status) {
        query = query.where('users.status', status)
      }

      if (search) {
        query = query.where(function () {
          this.where('users.fullname', 'ilike', `%${search}%`)
            .orWhere('users.email', 'ilike', `%${search}%`)
            .orWhere('users.username', 'ilike', `%${search}%`)
        })
      }

      const countQuery = query.clone()
      const [{ count }] = await countQuery.count('users.id as count')
      const totalData = Number.parseInt(count as string, 10)

      const dataQuery = query.select([
        'users.id',
        'users.email',
        'users.fullname',
        'users.username',
        'users.phone_number',
        'users.address',
        'users.status',
        'users.deposit_image_url',
        'users.created_at',
        'users.updated_at'
      ])

      const sortColumn = sortBy.includes('.') ? sortBy : `users.${sortBy}`
      const data = await dataQuery
        .orderBy(sortColumn, sortOrder)
        .limit(limit)
        .offset(offset)

      const pagination = this.createPaginationMetadata(page, limit, totalData)

      return {
        data: data,
        ...pagination
      }
    } catch (error) {
      this.logger.error(error)
      throw error
    }
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await this.knex('users')
      .select([
        'users.id',
        'users.email',
        'users.fullname',
        'users.username',
        'users.phone_number',
        'users.address',
        'users.status',
        'users.role_id',
        'users.otp_code',
        'users.otp_verified',
        'users.created_at',
        'users.updated_at'
      ])
      .where('users.id', id)
      .first()

    return result as User | undefined
  }

  async updateUser(
    id: string,
    data: UpdateUserEntity,
    trx?: Knex.Transaction
  ): Promise<User> {
    if (trx) {
      const [result] = await trx('users')
        .where('id', id)
        .update({
          ...data,
          updated_at: new Date()
        })
        .returning('*')

      if (!result) {
        throw new Error(`User with id ${id} not found`)
      }

      return result as User
    } else {
      const result = await this.updateById(id, {
        ...data,
        updated_at: new Date()
      } as User)

      if (!result) {
        throw new Error(`User with id ${id} not found`)
      }

      return result
    }
  }

  async updateStatus(
    id: string,
    status: string,
    trx?: Knex.Transaction
  ): Promise<User> {
    if (trx) {
      const [result] = await trx('users')
        .where('id', id)
        .update({
          status,
          updated_at: new Date()
        })
        .returning('*')

      if (!result) {
        throw new Error(`User with id ${id} not found`)
      }

      return result as User
    } else {
      return this.updateById(id, { status } as any)
    }
  }

  async getActiveMemberCount(trx?: Knex.Transaction): Promise<number> {
    const query = trx ? trx('users') : this.knex('users')
    const result = await query
      .where('status', 'active')
      .count('id as count')
      .first()

    return Number.parseInt(result?.count as string, 10) || 0
  }

  async getActiveMemberIds(): Promise<string[]> {
    const results = await this.knex('users')
      .where('status', 'active')
      .select('id')

    return results.map((row) => row.id)
  }
}

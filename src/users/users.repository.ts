import { Injectable } from '@nestjs/common'
import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import { User, NewUser, UpdateUser } from '../interface/users'
import { PaginationOptions, PaginationResult } from '../interface/pagination'

@Injectable()
export class UsersRepository extends BaseRepository<User> {
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
        'users.created_at',
        'users.updated_at',
        'roles.id as role'
      ])
      .where('users.email', email)
      .first()

    return result as (User & { role_name: string }) | undefined
  }

  async findByUsernameWithRole(
    username: string
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
        'users.created_at',
        'users.updated_at',
        'roles.id as role'
      ])
      .where('users.username', username)
      .first()

    return result as (User & { role_name: string }) | undefined
  }

  async findByIdentifierWithRole(
    identifier: string
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
        'users.created_at',
        'users.updated_at',
        'roles.id as role'
      ])
      .where('users.email', identifier)
      .orWhere('users.username', identifier)
      .first()

    return result as (User & { role_name: string }) | undefined
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const result = await this.knex('users').where('username', username).first()

    return result as User | undefined
  }

  async findAllWithRoles(
    options: PaginationOptions & { role?: string } = {}
  ): Promise<PaginationResult<User & { role_name: string }>> {
    const {
      role,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options

    const offset = (page - 1) * limit

    let countQuery = this.knex('users')
    if (role) {
      countQuery = countQuery
        .join('roles', 'roles.id', 'users.role_id')
        .where('roles.id', role)
    }

    const [{ count }] = await countQuery.count('users.id as count')
    const totalData = parseInt(count as string, 10)

    // Optimized data query with proper table prefixes
    let dataQuery = this.knex('users')
      .join('roles', 'roles.id', 'users.role_id')
      .select([
        'users.id',
        'users.email',
        'users.fullname',
        'users.username',
        'users.phone_number',
        'users.address',
        'users.status',
        'users.created_at',
        'users.updated_at',
        'roles.name as role_name'
      ])

    if (role) {
      dataQuery = dataQuery.where('roles.id', role)
    }

    // Apply sorting with proper table prefix
    const sortColumn = sortBy.includes('.') ? sortBy : `users.${sortBy}`
    dataQuery = dataQuery.orderBy(sortColumn, sortOrder)

    // Execute data query with pagination
    const data = await dataQuery.limit(limit).offset(offset)
    console.log(data)

    // Create pagination metadata using base repository helper
    const pagination = this.createPaginationMetadata(page, limit, totalData)

    return {
      data: data as (User & { role_name: string })[],
      ...pagination
    }
  }

  async createUser(data: NewUser): Promise<User> {
    return this.create(data)
  }

  async updateUser(id: string, data: UpdateUser): Promise<User> {
    return this.updateById(id, data as User)
  }

  async updateStatus(id: string, status: string): Promise<User> {
    return this.updateById(id, { status } as any)
  }
}

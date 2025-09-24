import { Injectable } from '@nestjs/common'
import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import { User, NewUser, UpdateUser } from '../database/types/users'

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
    page = 1,
    limit = 10,
    role?: string
  ): Promise<{
    data: (User & { role_name: string })[]
    total: number
    page: number
    limit: number
    next: boolean
    prev: boolean
  }> {
    const offset = (page - 1) * limit
    let countQuery: any
    if (role) {
      countQuery = this.knex('users')
        .join('roles', 'roles.id', 'users.role_id')
        .where('roles.id', role)
        .count('users.id as count')
    } else {
      countQuery = this.knex('users').count('id as count')
    }

    // Data query with JOIN for role information
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
        'users.role_id',
        'users.created_at',
        'users.updated_at',
        'roles.name as role_name'
      ])

    // Apply role filter to data query if provided
    if (role) {
      dataQuery = dataQuery.where('roles.id', role)
    }

    // Execute both queries in parallel for better performance
    const [countResult, data] = await Promise.all([
      countQuery,
      dataQuery.limit(limit).offset(offset).orderBy('users.created_at', 'desc')
    ])

    const total = Number(countResult[0].count)

    return {
      data: data as (User & { role_name: string })[],
      total,
      page,
      limit,
      next: offset + limit < total,
      prev: page > 1
    }
  }

  async createUser(data: NewUser): Promise<User> {
    return this.create(data as User)
  }

  async updateUser(id: string, data: UpdateUser): Promise<User> {
    return this.updateById(id, data as User)
  }

  async updateStatus(id: string, status: string): Promise<User> {
    return this.updateById(id, { status } as any)
  }
}

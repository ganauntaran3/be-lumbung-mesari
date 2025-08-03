import { Injectable } from '@nestjs/common'
import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import { User, NewUser, UpdateUser } from '../database/types/users'

@Injectable()
export class UserRepository extends BaseRepository<User> {
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
        'roles.name as role_name'
      ])
      .where('users.email', email)
      .first()

    return result as (User & { role_name: string }) | undefined
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const result = await this.knex('users').where('username', username).first()

    return result as User | undefined
  }

  async findAllWithRoles(
    page = 1,
    limit = 10
  ): Promise<{
    data: (User & { role_name: string })[]
    total: number
    page: number
    limit: number
  }> {
    const offset = (page - 1) * limit

    // Get total count
    const [{ count }] = await this.knex('users').count('id as count')

    // Get users with role information
    const data = await this.knex('users')
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
        'users.deposit_image_url',
        'users.created_at',
        'users.updated_at',
        'roles.name as role_name'
      ])
      .limit(limit)
      .offset(offset)

    return {
      data: data as (User & { role_name: string })[],
      total: Number(count),
      page,
      limit
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

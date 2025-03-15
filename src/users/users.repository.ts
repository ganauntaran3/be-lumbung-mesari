import { Injectable, Inject } from '@nestjs/common'
import { Knex } from 'knex'
import { DATABASE } from '../database/database.provider'

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DATABASE)
    private readonly knex: Knex
  ) {}

  async findAll() {
    return this.knex('users').select('*')
  }

  // Example methods
  async findById(id: string) {
    return this.knex('users').where({ id }).first()
  }

  async findByEmail(email: string) {
    return this.knex('users').where({ email }).first()
  }

  async create(userData: {
    username: string
    email: string
    password: string
    full_name: string
  }) {
    const [user] = await this.knex('users').insert(userData).returning('*')

    return user
  }

  // Transaction example
  async createWithTransaction(userData: {
    username: string
    email: string
    password: string
    full_name: string
  }) {
    return this.knex.transaction(async (trx) => {
      const [user] = await trx('users').insert(userData).returning('*')

      // You can do more operations within the same transaction
      // If any operation fails, everything will be rolled back

      return user
    })
  }
}

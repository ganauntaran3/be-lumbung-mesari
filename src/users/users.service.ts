import { Injectable, ConflictException } from '@nestjs/common'
import { NewUser } from '../interface/users'
import { UsersRepository } from './users.repository'
import { PaginationOptions } from '../interface/pagination'
import { UsersPaginatedResponse, UserWithRole } from '../interface/users'

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) { }

  async findByEmail(email: string) {
    return await this.usersRepository.findByEmail(email)
  }

  async findByEmailWithRole(email: string) {
    return await this.usersRepository.findByEmailWithRole(email)
  }

  async findByIdentifierWithRole(identifier: string) {
    return await this.usersRepository.findByIdentifierWithRole(identifier)
  }

  async create(userData: NewUser) {
    const existingUser = await this.findByEmail(userData.email)
    if (existingUser) {
      throw new ConflictException('Email already exists')
    }

    return await this.usersRepository.create(userData)
  }

  async findAll() {
    return await this.usersRepository.findAll()
  }

  async findAllWithPagination(
    options: PaginationOptions & { role?: string } = {}
  ): Promise<UsersPaginatedResponse> {
    const result = await this.usersRepository.findAllWithRoles(options)

    return {
      ...result as UsersPaginatedResponse
    }
  }
}

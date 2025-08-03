import { Injectable, ConflictException } from '@nestjs/common'
import { NewUser } from '../database/types/users'
import { UserRepository } from '../users/user.repository'

@Injectable()
export class UsersService {
  constructor(private usersRepository: UserRepository) {}

  async findByEmail(email: string) {
    return await this.usersRepository.findByEmail(email)
  }

  async findByEmailWithRole(email: string) {
    return await this.usersRepository.findByEmailWithRole(email)
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
}

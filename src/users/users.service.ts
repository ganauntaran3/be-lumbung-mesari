import { Injectable } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll() {
    return this.usersRepository.findAll()
  }

  async createUser(createUserDto: {
    username: string
    email: string
    password: string
    full_name: string
  }) {
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10)

    return this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword
    })
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email)
  }

  async findById(id: string) {
    return this.usersRepository.findById(id)
  }
}

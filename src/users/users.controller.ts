import { Controller, Get, Inject } from '@nestjs/common'
import { UsersService } from './users.service'

@Controller('/api/v1/users')
export class UsersController {
  @Inject()
  private readonly usersService: UsersService

  @Get()
  async findAll() {
    return this.usersService.findAll()
  }
}

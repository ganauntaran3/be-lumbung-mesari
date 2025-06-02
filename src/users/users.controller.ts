import {
  Controller,
  Get,
  Version,
  VERSION_NEUTRAL
} from '@nestjs/common'
import { UsersService } from './users.service'

@Controller('/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Version(VERSION_NEUTRAL)
  @Get()
  async findAllNeutral() {
    return this.findAllV1()
  }

  @Version('1')
  @Get()
  async findAllV1() {
    return this.usersService.findAll()
  }

  @Version('2')
  @Get()
  async findAllV2() {
    return this.usersService.findAll()
  }
}

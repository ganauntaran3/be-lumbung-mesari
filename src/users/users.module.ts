import { Module } from '@nestjs/common'

import { DatabaseModule } from '../database/database.module'
import { UsersSavingsModule } from '../users-savings/users-savings.module'

import { UsersController } from './users.controller'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

@Module({
  imports: [DatabaseModule, UsersSavingsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository]
})
export class UsersModule {}

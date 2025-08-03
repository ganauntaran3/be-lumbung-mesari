import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UserRepository } from './user.repository'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UserRepository],
  exports: [UsersService]
})
export class UsersModule {}

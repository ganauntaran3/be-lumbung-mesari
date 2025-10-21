import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'
import { DatabaseModule } from '../database/database.module'
import { UsersSavingsModule } from '../users-savings/users-savings.module'

@Module({
  imports: [
    DatabaseModule,
    UsersSavingsModule
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService]
})
export class UsersModule { }

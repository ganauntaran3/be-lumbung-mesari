import { Module } from '@nestjs/common'

import { DatabaseModule } from '../database/database.module'
import { LoansModule } from '../loans/loans.module'
import { MandatorySavingsRepository } from '../savings/mandatory-savings.repository'
import { UsersSavingsModule } from '../users-savings/users-savings.module'

import { UsersController } from './users.controller'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

@Module({
  imports: [DatabaseModule, UsersSavingsModule, LoansModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, MandatorySavingsRepository],
  exports: [UsersService, UsersRepository]
})
export class UsersModule {}

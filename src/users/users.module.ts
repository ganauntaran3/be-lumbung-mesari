import { Module, forwardRef } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'
import { DatabaseModule } from '../database/database.module'
import { SavingsModule } from '../savings/savings.module'


@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => SavingsModule)
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService]
})
export class UsersModule { }

import { Module } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'

@Module({
  providers: [UsersRepository, UsersService],
  controllers: [UsersController],
  exports: [UsersService] // Export if other modules need to use UsersService
})
export class UsersModule {}

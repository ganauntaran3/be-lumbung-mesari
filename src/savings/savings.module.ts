import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { ConfigModule } from '@nestjs/config'
import { SavingsController } from './savings.controller'
import { SavingsService } from './savings.service'
import { SavingsRepository } from './savings.repository'
import { SavingsScheduler } from './savings.scheduler'
import { DatabaseModule } from '../database/database.module'
import { UsersModule } from '../users/users.module'

@Module({
    imports: [
        DatabaseModule,
        UsersModule,
        ConfigModule,
        ScheduleModule.forRoot()
    ],
    controllers: [SavingsController],
    providers: [SavingsService, SavingsRepository, SavingsScheduler],
    exports: [SavingsService]
})
export class SavingsModule { }
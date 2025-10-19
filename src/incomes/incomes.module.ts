import { Module } from '@nestjs/common'
import { IncomesService } from './incomes.service'
import { IncomesRepository } from './incomes.repository'
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [IncomesService, IncomesRepository],
    exports: [IncomesService]
})
export class IncomesModule { }

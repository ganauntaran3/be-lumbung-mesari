import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { CronJob } from 'cron'
import { MandatorySavingsService } from './mandatory-savings.service'

@Injectable()
export class SavingsScheduler implements OnModuleInit {
    private readonly logger = new Logger(SavingsScheduler.name)

    constructor(
        private readonly mandatorySavingsService: MandatorySavingsService,
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry
    ) { }

    onModuleInit() {
        const timezone = this.configService.get<string>('TZ', 'Asia/Jakarta')

        const job = new CronJob(
            CronExpression.EVERY_YEAR,
            () => this.createYearlyMandatorySavings(),
            null,
            true,
            timezone
        )

        this.schedulerRegistry.addCronJob('yearly-mandatory-savings', job)

        this.logger.log(`Yearly mandatory savings cron job registered with timezone: ${timezone}`)
        this.logger.log(`Next execution: ${job.nextDate().toISO()}`)
    }

    async createYearlyMandatorySavings(): Promise<void> {
        this.logger.log('Starting yearly mandatory savings creation cron job (12 months) - Triggered on January 1st')

        try {
            await this.mandatorySavingsService.createYearlyMandatorySavingsForAllUsers()
            this.logger.log('Yearly mandatory savings creation completed successfully')
        } catch (error) {
            this.logger.error('Yearly mandatory savings creation failed:', error)
        }
    }
}
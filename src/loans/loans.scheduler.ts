import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'

import { LoansService } from './loans.service'

@Injectable()
export class LoansScheduler implements OnModuleInit {
  private readonly logger = new Logger(LoansScheduler.name)

  constructor(
    private readonly loansService: LoansService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  onModuleInit() {
    const timezone = this.configService.get<string>('TZ', 'Asia/Jakarta')

    // Run on 21st of every month at midnight
    const job = new CronJob(
      '0 0 21 * *',
      () => this.checkOverdueInstallments(),
      null,
      true,
      timezone
    )

    this.schedulerRegistry.addCronJob('check-overdue-installments', job)

    this.logger.log(
      `Overdue installments check cron job registered with timezone: ${timezone}`
    )
    this.logger.log(`Next execution: ${job.nextDate().toISO()}`)
  }

  async checkOverdueInstallments(): Promise<void> {
    this.logger.log(
      'Starting overdue installments check - Triggered on 21st of the month'
    )

    try {
      await this.loansService.processOverdueInstallments()
      this.logger.log('Overdue installments check completed successfully')
    } catch (error) {
      this.logger.error('Overdue installments check failed:', error)
    }
  }
}

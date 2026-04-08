import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { ADVISORY_LOCK_ID_CHECK_OVERDUE_INSTALLMENTS } from 'src/common/constants'

import { DatabaseService } from '../database/database.service'

import { LoansService } from './loans.service'

@Injectable()
export class LoansScheduler implements OnModuleInit {
  private readonly logger = new Logger(LoansScheduler.name)

  constructor(
    private readonly loansService: LoansService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly databaseService: DatabaseService
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

    const knex = this.databaseService.getKnex()
    const result = await knex.raw<{ rows: { acquired: boolean }[] }>(
      'SELECT pg_try_advisory_lock(?) AS acquired',
      [ADVISORY_LOCK_ID_CHECK_OVERDUE_INSTALLMENTS]
    )
    const acquired: boolean = result.rows[0]?.acquired

    if (!acquired) {
      this.logger.warn(
        'Overdue installments check skipped — another pod holds the lock'
      )
      return
    }

    try {
      await this.loansService.processOverdueInstallments()
      this.logger.log('Overdue installments check completed successfully')
    } catch (error) {
      this.logger.error('Overdue installments check failed:', error)
    } finally {
      await knex.raw('SELECT pg_advisory_unlock(?)', [
        ADVISORY_LOCK_ID_CHECK_OVERDUE_INSTALLMENTS
      ])
    }
  }
}

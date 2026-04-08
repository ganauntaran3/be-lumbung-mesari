import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { ADVISORY_LOCK_ID_GENERATE_YEARLY_MANDATORY_SAVINGS } from 'src/common/constants'

import { DatabaseService } from '../database/database.service'

import { MandatorySavingsService } from './savings.service'

@Injectable()
export class SavingsScheduler implements OnModuleInit {
  private readonly logger = new Logger(SavingsScheduler.name)

  constructor(
    private readonly mandatorySavingsService: MandatorySavingsService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly databaseService: DatabaseService
  ) {}

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

    this.logger.log(
      `Yearly mandatory savings cron job registered with timezone: ${timezone}`
    )
    this.logger.log(`Next execution: ${job.nextDate().toISO()}`)
  }

  async createYearlyMandatorySavings(): Promise<void> {
    this.logger.log(
      'Starting yearly mandatory savings creation cron job (12 months) - Triggered on January 1st'
    )

    const knex = this.databaseService.getKnex()
    const result = await knex.raw<{ rows: { acquired: boolean }[] }>(
      'SELECT pg_try_advisory_lock(?) AS acquired',
      [ADVISORY_LOCK_ID_GENERATE_YEARLY_MANDATORY_SAVINGS]
    )
    const acquired: boolean = result.rows[0]?.acquired

    if (!acquired) {
      this.logger.warn(
        'Yearly mandatory savings job skipped — another pod holds the lock'
      )
      return
    }

    try {
      await this.mandatorySavingsService.createYearlyMandatorySavingsForAllUsers()
      this.logger.log(
        'Yearly mandatory savings creation completed successfully'
      )
    } catch (error) {
      this.logger.error('Yearly mandatory savings creation failed:', error)
    } finally {
      await knex.raw('SELECT pg_advisory_unlock(?)', [
        ADVISORY_LOCK_ID_GENERATE_YEARLY_MANDATORY_SAVINGS
      ])
    }
  }
}

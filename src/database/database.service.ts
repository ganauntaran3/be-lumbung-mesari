import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger
} from '@nestjs/common'
import { Knex, knex } from 'knex'
import { ConfigService } from '@nestjs/config'
import { getDatabaseConfig } from './database.config'

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly knex: Knex
  private isDestroyed = false
  private readonly logger = new Logger(DatabaseService.name)

  constructor(private configService: ConfigService) {
    this.knex = knex(getDatabaseConfig(this.configService))
  }

  async onModuleInit() {
    try {
      await this.knex.raw('SELECT 1')
      this.logger.log('Database connected successfully')
    } catch (error) {
      this.logger.error('Database connection failed:', error)
      throw error
    }
  }

  getKnex(): Knex {
    if (this.isDestroyed) {
      throw new Error('Database connection has been destroyed')
    }
    return this.knex
  }

  table(tableName: string): Knex.QueryBuilder {
    if (this.isDestroyed) {
      throw new Error('Database connection has been destroyed')
    }
    return this.knex(tableName)
  }

  async onModuleDestroy() {
    if (this.isDestroyed) {
      return
    }

    this.isDestroyed = true

    try {
      await this.knex.destroy()
      this.logger.log('Database connection closed successfully')
    } catch (error) {
      this.logger.error('Error during database cleanup:', error)
    }
  }
}

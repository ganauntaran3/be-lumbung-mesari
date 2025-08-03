import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { ConfigService } from '@nestjs/config'
import { Database } from './types/database'

@Injectable()
export class DatabaseService
  extends Kysely<Database>
  implements OnModuleDestroy
{
  private readonly pool: Pool
  private isDestroyed = false

  constructor(configService: ConfigService) {
    const pool = new Pool({
      database: configService.get<string>('DB_NAME'),
      host: configService.get<string>('DB_HOST'),
      user: configService.get<string>('DB_USER'),
      password: configService.get<string>('DB_PASSWORD'),
      port: configService.get<number>('DB_PORT', 5432),
      min: configService.get<number>('DB_POOL_MIN', 2),
      max: configService.get<number>('DB_POOL_MAX', 10),
      // SSL for production
      ssl:
        configService.get<string>('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false } // Set to true in production with proper certs
          : false,

      // Timeouts
      statement_timeout: 30000,
      query_timeout: 30000,
      application_name: configService.get<string>('APPLICATION_NAME')
    })

    super({
      dialect: new PostgresDialect({ pool })
    })

    this.pool = pool
  }

  async onModuleDestroy() {
    if (this.isDestroyed) {
      return
    }

    this.isDestroyed = true

    try {
      // Only destroy the Kysely instance, which will handle the pool
      await this.destroy()
    } catch (error) {
      console.error('Error during database cleanup:', error)
    }
  }
}

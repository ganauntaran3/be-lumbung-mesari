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

  constructor(configService: ConfigService) {
    const pool = new Pool({
      database: configService.get<string>('DB_NAME'),
      host: configService.get<string>('DB_HOST'),
      user: configService.get<string>('DB_USER'),
      password: configService.get<string>('DB_PASSWORD'),
      port: configService.get<number>('DB_PORT', 5432),
      max: 10
    })

    super({
      dialect: new PostgresDialect({ pool })
    })

    this.pool = pool
  }

  async onModuleDestroy() {
    await this.pool.end()
    await this.destroy()
  }
}

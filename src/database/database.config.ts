import { ConfigService } from '@nestjs/config'
import { Knex } from 'knex'
import { types } from 'pg'

// Prevent the pg driver from converting `date` columns to JS Date objects.
// Without this, date-only values (e.g. "2026-02-27") get parsed as midnight
// in the server's local timezone and serialized as a full UTC ISO timestamp,
// causing off-by-one-day bugs on clients in different timezones.
// OID 1082 = date type
types.setTypeParser(1082, (val: string) => val)

export const getDatabaseConfig = (
  configService: ConfigService
): Knex.Config => ({
  client: 'pg',
  connection: {
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT', 5432),
    user: configService.get<string>('DB_USER'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_NAME'),
    ssl: false
  },
  pool: {
    min: parseInt(configService.get<string>('DB_POOL_MIN', '2'), 10),
    max: parseInt(configService.get<string>('DB_POOL_MAX', '10'), 10)
  },
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './src/database/seeds'
  }
})

import { ConfigService } from '@nestjs/config'
import { Knex } from 'knex'

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

import { Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Knex, knex } from 'knex'

export const DATABASE = Symbol('DATABASE')

export const databaseProvider: Provider = {
  provide: DATABASE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Knex => {
    const config = configService.get('database')
    return knex(config)
  }
}

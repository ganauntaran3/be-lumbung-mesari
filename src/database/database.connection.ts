import { Knex } from 'knex'

export class DatabaseConnection {
  constructor(public readonly knex: Knex) {}
}

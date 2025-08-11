import { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  await knex('roles').insert([
    {
      id: 'administrator',
      name: 'Administrator'
    },
    {
      id: 'member',
      name: 'Member'
    }
  ])
}

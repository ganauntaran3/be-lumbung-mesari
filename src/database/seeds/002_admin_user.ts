import { hash } from 'bcrypt'
import { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  const hashedPassword = await hash('admin123', 10)

  await knex('users').insert([
    {
      email: 'admin@lumbungmesari.com',
      fullname: 'System Administrator',
      username: 'admin',
      password: hashedPassword,
      phone_number: '+62812345678',
      address: 'Lumbung Mesari Office',
      status: 'active',
      role_id: 'administrator'
    }
  ])

  await knex('users').insert([
    {
      email: 'superadmin@lumbungmesari.com',
      fullname: 'System Super Administrator',
      username: 'superadmin',
      password: hashedPassword,
      phone_number: '+62812345679',
      address: 'Lumbung Mesari Office',
      status: 'active',
      role_id: 'superadministrator'
    }
  ])
}

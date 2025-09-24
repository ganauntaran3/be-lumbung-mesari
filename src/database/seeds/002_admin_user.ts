import { Knex } from 'knex'
import { hash } from 'bcrypt'

export async function seed(knex: Knex): Promise<void> {
  const hashedPassword = await hash('admin123', 10)

  // Insert admin user
  await knex('users').insert([
    {
      email: 'admin@lumbungmesari.com',
      fullname: 'System Administrator',
      username: 'admin',
      password: hashedPassword,
      phone_number: '+62812345678',
      address: 'Lumbung Mesari Office',
      status: 'active',
      role_id: 'administrator',
      deposit_image_url: null
    }
  ])

  // Insert super admin user
  await knex('users').insert([
    {
      email: 'superadmin@lumbungmesari.com',
      fullname: 'System Super Administrator',
      username: 'superadmin',
      password: hashedPassword,
      phone_number: '+62812345679',
      address: 'Lumbung Mesari Office',
      status: 'active',
      role_id: 'super-administrator',
      deposit_image_url: null
    }
  ])
}

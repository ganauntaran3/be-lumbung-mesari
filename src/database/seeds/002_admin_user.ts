import { Knex } from 'knex'
import { hash } from 'bcrypt'

export async function seed(knex: Knex): Promise<void> {
  const hashedPassword = await hash('admin123', 10)

  await knex('users').insert([
    {
      id: 'admin-001',
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
}

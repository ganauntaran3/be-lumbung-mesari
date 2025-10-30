import { Knex } from 'knex'
import { hash } from 'bcrypt'

export async function seed(knex: Knex): Promise<void> {
  const hashedPassword = await hash('member123', 10)

  // Insert 10 member users
  const memberUsers = [
    {
      email: 'andi.setiawan@gmail.com',
      fullname: 'Andi Setiawan',
      username: 'andi_setiawan',
      password: hashedPassword,
      phone_number: '+6281234567801',
      address: 'Jl. Mawar No. 12, Bandung',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'sari.dewi@gmail.com',
      fullname: 'Sari Dewi',
      username: 'sari_dewi',
      password: hashedPassword,
      phone_number: '+6281234567802',
      address: 'Jl. Melati No. 25, Jakarta',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'budi.santoso@gmail.com',
      fullname: 'Budi Santoso',
      username: 'budi_santoso',
      password: hashedPassword,
      phone_number: '+6281234567803',
      address: 'Jl. Kenanga No. 8, Surabaya',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'rina.kartika@gmail.com',
      fullname: 'Rina Kartika',
      username: 'rina_kartika',
      password: hashedPassword,
      phone_number: '+6281234567804',
      address: 'Jl. Anggrek No. 15, Medan',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'joko.widodo@gmail.com',
      fullname: 'Joko Widodo',
      username: 'joko_widodo',
      password: hashedPassword,
      phone_number: '+6281234567805',
      address: 'Jl. Flamboyan No. 33, Yogyakarta',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'maya.sari@gmail.com',
      fullname: 'Maya Sari',
      username: 'maya_sari',
      password: hashedPassword,
      phone_number: '+6281234567806',
      address: 'Jl. Dahlia No. 7, Semarang',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'agus.prasetyo@gmail.com',
      fullname: 'Agus Prasetyo',
      username: 'agus_prasetyo',
      password: hashedPassword,
      phone_number: '+6281234567807',
      address: 'Jl. Cempaka No. 19, Malang',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'lina.maharani@gmail.com',
      fullname: 'Lina Maharani',
      username: 'lina_maharani',
      password: hashedPassword,
      phone_number: '+6281234567808',
      address: 'Jl. Teratai No. 42, Palembang',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'dedi.kurniawan@gmail.com',
      fullname: 'Dedi Kurniawan',
      username: 'dedi_kurniawan',
      password: hashedPassword,
      phone_number: '+6281234567809',
      address: 'Jl. Sakura No. 11, Makassar',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'fitri.rahayu@gmail.com',
      fullname: 'Fitri Rahayu',
      username: 'fitri_rahayu',
      password: hashedPassword,
      phone_number: '+6281234567810',
      address: 'Jl. Bougenville No. 28, Denpasar',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    }
  ]

  await knex('users').insert(memberUsers)
}

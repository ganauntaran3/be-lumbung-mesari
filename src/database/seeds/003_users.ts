import { Knex } from 'knex'
import { hash } from 'bcrypt'

export async function seed(knex: Knex): Promise<void> {
  const hashedPassword = await hash('member123', 10)

  // Insert 30 member users
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
    },
    {
      email: 'hendra.wijaya@gmail.com',
      fullname: 'Hendra Wijaya',
      username: 'hendra_wijaya',
      password: hashedPassword,
      phone_number: '+6281234567811',
      address: 'Jl. Kamboja No. 5, Pontianak',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'indah.permata@gmail.com',
      fullname: 'Indah Permata',
      username: 'indah_permata',
      password: hashedPassword,
      phone_number: '+6281234567812',
      address: 'Jl. Tulip No. 17, Balikpapan',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'rudi.hartono@gmail.com',
      fullname: 'Rudi Hartono',
      username: 'rudi_hartono',
      password: hashedPassword,
      phone_number: '+6281234567813',
      address: 'Jl. Seroja No. 22, Pekanbaru',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'dewi.lestari@gmail.com',
      fullname: 'Dewi Lestari',
      username: 'dewi_lestari',
      password: hashedPassword,
      phone_number: '+6281234567814',
      address: 'Jl. Matahari No. 36, Banjarmasin',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'bambang.susilo@gmail.com',
      fullname: 'Bambang Susilo',
      username: 'bambang_susilo',
      password: hashedPassword,
      phone_number: '+6281234567815',
      address: 'Jl. Bulan No. 9, Jambi',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'nurul.hidayah@gmail.com',
      fullname: 'Nurul Hidayah',
      username: 'nurul_hidayah',
      password: hashedPassword,
      phone_number: '+6281234567816',
      address: 'Jl. Bintang No. 14, Lampung',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'ferry.gunawan@gmail.com',
      fullname: 'Ferry Gunawan',
      username: 'ferry_gunawan',
      password: hashedPassword,
      phone_number: '+6281234567817',
      address: 'Jl. Pelangi No. 31, Padang',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'yuni.astuti@gmail.com',
      fullname: 'Yuni Astuti',
      username: 'yuni_astuti',
      password: hashedPassword,
      phone_number: '+6281234567818',
      address: 'Jl. Awan No. 26, Manado',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'eko.prasetyo@gmail.com',
      fullname: 'Eko Prasetyo',
      username: 'eko_prasetyo',
      password: hashedPassword,
      phone_number: '+6281234567819',
      address: 'Jl. Hujan No. 18, Samarinda',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'ratna.sari@gmail.com',
      fullname: 'Ratna Sari',
      username: 'ratna_sari',
      password: hashedPassword,
      phone_number: '+6281234567820',
      address: 'Jl. Salju No. 4, Ambon',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'wahyu.nugroho@gmail.com',
      fullname: 'Wahyu Nugroho',
      username: 'wahyu_nugroho',
      password: hashedPassword,
      phone_number: '+6281234567821',
      address: 'Jl. Embun No. 39, Kupang',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'sri.mulyani@gmail.com',
      fullname: 'Sri Mulyani',
      username: 'sri_mulyani',
      password: hashedPassword,
      phone_number: '+6281234567822',
      address: 'Jl. Fajar No. 13, Jayapura',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'anton.setiawan@gmail.com',
      fullname: 'Anton Setiawan',
      username: 'anton_setiawan',
      password: hashedPassword,
      phone_number: '+6281234567823',
      address: 'Jl. Senja No. 27, Mataram',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'diah.ayu@gmail.com',
      fullname: 'Diah Ayu',
      username: 'diah_ayu',
      password: hashedPassword,
      phone_number: '+6281234567824',
      address: 'Jl. Rembulan No. 21, Ternate',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'rizki.ramadhan@gmail.com',
      fullname: 'Rizki Ramadhan',
      username: 'rizki_ramadhan',
      password: hashedPassword,
      phone_number: '+6281234567825',
      address: 'Jl. Cahaya No. 35, Gorontalo',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'lisa.andriani@gmail.com',
      fullname: 'Lisa Andriani',
      username: 'lisa_andriani',
      password: hashedPassword,
      phone_number: '+6281234567826',
      address: 'Jl. Mentari No. 16, Kendari',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'fajar.hidayat@gmail.com',
      fullname: 'Fajar Hidayat',
      username: 'fajar_hidayat',
      password: hashedPassword,
      phone_number: '+6281234567827',
      address: 'Jl. Sinar No. 29, Palu',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'wati.susanti@gmail.com',
      fullname: 'Wati Susanti',
      username: 'wati_susanti',
      password: hashedPassword,
      phone_number: '+6281234567828',
      address: 'Jl. Terang No. 6, Mamuju',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'irwan.maulana@gmail.com',
      fullname: 'Irwan Maulana',
      username: 'irwan_maulana',
      password: hashedPassword,
      phone_number: '+6281234567829',
      address: 'Jl. Cerah No. 41, Sorong',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    },
    {
      email: 'putri.maharani@gmail.com',
      fullname: 'Putri Maharani',
      username: 'putri_maharani',
      password: hashedPassword,
      phone_number: '+6281234567830',
      address: 'Jl. Gemilang No. 23, Merauke',
      status: 'active',
      role_id: 'member',
      deposit_image_url: null
    }
  ]

  await knex('users').insert(memberUsers)
}

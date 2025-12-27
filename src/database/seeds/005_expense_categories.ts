import { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('expense_categories')
  if (!hasTable) {
    console.log(
      '⚠️  expense_categories table does not exist yet. Skipping seed.'
    )
    return
  }

  // Check if categories already exist
  const existingCategories = await knex('expense_categories').select('code')
  const existingCodes = existingCategories.map((cat) => cat.code)

  const categories = [
    {
      code: 'operational',
      name: 'Biaya Operasional',
      description:
        'Biaya operasional harian seperti listrik, air, telepon, internet, dan kebutuhan kantor',
      default_source: 'auto'
    },
    {
      code: 'administrative',
      name: 'Biaya Administrasi',
      description:
        'Biaya administrasi seperti alat tulis kantor, formulir, materai, dan keperluan administrasi lainnya',
      default_source: 'auto'
    },
    {
      code: 'maintenance',
      name: 'Pemeliharaan dan Perbaikan',
      description:
        'Biaya pemeliharaan gedung, peralatan, kendaraan, dan perbaikan fasilitas',
      default_source: 'auto'
    },
    {
      code: 'legal_compliance',
      name: 'Legal dan Kepatuhan',
      description:
        'Biaya perizinan, audit, konsultasi hukum, dan kepatuhan regulasi',
      default_source: 'capital'
    },
    {
      code: 'loan_disbursement',
      name: 'Pemberian Pinjaman',
      description: 'Pengeluaran untuk memberikan pinjaman kepada anggota',
      default_source: 'auto'
    },
    {
      code: 'others',
      name: 'Pengeluaran Lain-lain',
      description:
        'Pengeluaran lain yang tidak termasuk dalam kategori di atas',
      default_source: 'auto'
    }
  ]

  // Filter out categories that already exist
  const newCategories = categories.filter(
    (category) => !existingCodes.includes(category.code)
  )

  if (newCategories.length === 0) {
    console.log('ℹ️  All expense categories already exist. Skipping insert.')
    return
  }

  await knex('expense_categories').insert(newCategories)

  console.log(
    `✅ Expense categories seeded successfully (${newCategories.length} new categories added)`
  )
}

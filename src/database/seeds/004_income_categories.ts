import { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('income_categories')
    if (!hasTable) {
        console.log('⚠️  income_categories table does not exist yet. Skipping seed.')
        return
    }

    await knex('income_categories').insert([
        {
            code: 'principal_savings',
            name: 'Simpanan Pokok',
            description: 'Pendapatan dari simpanan pokok anggota baru yang bergabung dengan koperasi',
            default_destination: 'capital'
        },
        {
            code: 'mandatory_savings',
            name: 'Simpanan Wajib',
            description: 'Pendapatan dari simpanan wajib bulanan anggota',
            default_destination: 'capital'
        },
        {
            code: 'loan_interest',
            name: 'Bunga Pinjaman',
            description: 'Pendapatan dari bunga pinjaman yang dibayarkan oleh peminjam',
            default_destination: 'shu'
        },
        {
            code: 'loan_admin_fee',
            name: 'Biaya Administrasi Pinjaman',
            description: 'Pendapatan dari biaya administrasi pengajuan pinjaman',
            default_destination: 'shu'
        },
        {
            code: 'late_payment_penalty',
            name: 'Denda Keterlambatan',
            description: 'Pendapatan dari denda keterlambatan pembayaran pinjaman atau simpanan',
            default_destination: 'shu'
        },
        {
            code: 'donation',
            name: 'Donasi',
            description: 'Pendapatan dari donasi atau sumbangan pihak ketiga',
            default_destination: 'capital'
        },
        {
            code: 'others',
            name: 'Pendapatan Lain-lain',
            description: 'Pendapatan dari sumber lain yang tidak termasuk kategori di atas',
            default_destination: 'capital'
        }
    ])

    console.log('✅ Income categories seeded successfully')
}

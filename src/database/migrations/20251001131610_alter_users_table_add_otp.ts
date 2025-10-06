import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.string('otp_code', 6).nullable()
        table.timestamp('otp_expires_at').nullable()
        table.boolean('otp_verified').defaultTo(false)
    })
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('otp_code')
        table.dropColumn('otp_expires_at')
        table.dropColumn('otp_verified')
    })
}

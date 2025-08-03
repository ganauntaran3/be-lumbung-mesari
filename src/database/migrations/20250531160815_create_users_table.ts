import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'varchar(36)', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()::varchar`)
    )
    .addColumn('email', 'varchar', (col) => col.notNull().unique())
    .addColumn('fullname', 'varchar', (col) => col.notNull())
    .addColumn('username', 'varchar', (col) => col.notNull().unique())
    .addColumn('password', 'varchar', (col) => col.notNull())
    .addColumn('phone_number', 'varchar', (col) => col.notNull())
    .addColumn('address', 'text', (col) => col.notNull())
    .addColumn('status', 'varchar', (col) => col.notNull().defaultTo('pending'))
    .addColumn('role_id', 'varchar', (col) =>
      col.references('roles.id').onDelete('restrict').notNull()
    )
    .addColumn('id_card_image', 'varchar', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').execute()
}

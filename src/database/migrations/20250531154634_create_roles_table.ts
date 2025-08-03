import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`.execute(db)
  await db.schema
    .createTable('roles')
    .addColumn('id', 'varchar(16)', (col) => col.primaryKey())
    .addColumn('name', 'varchar(64)', (col) => col.notNull().unique())
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('roles').execute()
}

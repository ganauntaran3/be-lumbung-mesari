import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Create audit_logs table for tracking all administrative actions
  await db.schema
    .createTable('audit_logs')
    .addColumn('id', 'varchar(36)', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()::varchar`)
    )
    .addColumn('user_id', 'varchar(36)', (col) =>
      col.references('users.id').onDelete('set null')
    )
    .addColumn('action', 'varchar', (col) => col.notNull())
    .addColumn('entity_type', 'varchar', (col) => col.notNull())
    .addColumn('entity_id', 'varchar', (col) => col.notNull())
    .addColumn('old_values', 'jsonb')
    .addColumn('new_values', 'jsonb')
    .addColumn('ip_address', 'varchar')
    .addColumn('user_agent', 'varchar')
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  // Create notification_types table
  await db.schema
    .createTable('notification_types')
    .addColumn('id', 'varchar(36)', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()::varchar`)
    )
    .addColumn('name', 'varchar', (col) => col.notNull().unique())
    .addColumn('description', 'text')
    .addColumn('template', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  // Create notifications table
  await db.schema
    .createTable('notifications')
    .addColumn('id', 'varchar(36)', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()::varchar`)
    )
    .addColumn('user_id', 'varchar(36)', (col) =>
      col.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('notification_type_id', 'uuid', (col) =>
      col.references('notification_types.id').onDelete('restrict').notNull()
    )
    .addColumn('title', 'varchar', (col) => col.notNull())
    .addColumn('message', 'text', (col) => col.notNull())
    .addColumn('data', 'jsonb')
    .addColumn('is_read', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('read_at', 'timestamp')
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  // Create email_logs table for tracking all sent emails
  await db.schema
    .createTable('email_logs')
    .addColumn('id', 'varchar(36)', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()::varchar`)
    )
    .addColumn('user_id', 'varchar(36)', (col) =>
      col.references('users.id').onDelete('set null')
    )
    .addColumn('email', 'varchar', (col) => col.notNull())
    .addColumn('subject', 'varchar', (col) => col.notNull())
    .addColumn('body', 'text', (col) => col.notNull())
    .addColumn('status', 'varchar', (col) => col.notNull())
    .addColumn('error', 'text')
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute()

  // Insert default notification types
  await db
    .insertInto('notification_types')
    .values([
      {
        name: 'account_approval',
        description: 'Account approval notification',
        template:
          'Your account has been approved. You can now access all features.'
      },
      {
        name: 'transaction_confirmation',
        description: 'Transaction confirmation notification',
        template: 'Your transaction of {{amount}} has been {{status}}.'
      },
      {
        name: 'loan_approval',
        description: 'Loan approval notification',
        template: 'Your loan application for {{amount}} has been {{status}}.'
      },
      {
        name: 'payment_reminder',
        description: 'Payment reminder notification',
        template:
          'Reminder: Your loan payment of {{amount}} is due on {{due_date}}.'
      },
      {
        name: 'late_payment',
        description: 'Late payment notification',
        template:
          'Your loan payment of {{amount}} was due on {{due_date}} and is now overdue.'
      }
    ])
    .execute()

  await sql`
  CREATE INDEX notifications_user_id_idx 
  ON notifications (user_id);
`.execute(db)

  await sql`
  CREATE INDEX notifications_type_id_idx 
  ON notifications (notification_type_id);
`.execute(db)

  await sql`
  CREATE INDEX notifications_unread_idx 
  ON notifications (user_id) 
  WHERE is_read = false;
`.execute(db)

  // Index untuk audit_logs
  await sql`
  CREATE INDEX audit_logs_user_id_idx 
  ON audit_logs (user_id);
`.execute(db)

  // Index untuk email_logs
  await sql`
  CREATE INDEX email_logs_user_id_idx 
  ON email_logs (user_id);
`.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS notifications_unread_idx`.execute(db)
  await sql`DROP INDEX IF EXISTS notifications_user_id_idx`.execute(db)
  await sql`DROP INDEX IF EXISTS notifications_type_id_idx`.execute(db)
  await sql`DROP INDEX IF EXISTS audit_logs_user_id_idx`.execute(db)
  await sql`DROP INDEX IF EXISTS email_logs_user_id_idx`.execute(db)

  await db.schema.dropTable('email_logs').execute()
  await db.schema.dropTable('notifications').execute()
  await db.schema.dropTable('notification_types').execute()
  await db.schema.dropTable('audit_logs').execute()
}

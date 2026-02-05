import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create audit_logs table for tracking all administrative actions
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'))
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL')
    table.string('action').notNullable()
    table.string('entity_type').notNullable()
    table.string('entity_id').notNullable()
    table.jsonb('old_values')
    table.jsonb('new_values')
    table.string('ip_address')
    table.string('user_agent')
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
  })

  // Create notification_types table
  await knex.schema.createTable('notification_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'))
    table.string('name').notNullable().unique()
    table.text('description')
    table.text('template').notNullable()
    table.timestamps(true, true)
  })

  // Create notifications table
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'))
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .notNullable()
    table
      .uuid('notification_type_id')
      .references('id')
      .inTable('notification_types')
      .onDelete('RESTRICT')
      .notNullable()
    table.string('title').notNullable()
    table.text('message').notNullable()
    table.jsonb('data')
    table.boolean('is_read').notNullable().defaultTo(false)
    table.timestamp('read_at')
    table.timestamps(true, true)
  })

  // Create email_logs table for tracking all sent emails
  await knex.schema.createTable('email_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'))
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL')
    table.string('email').notNullable()
    table.string('subject').notNullable()
    table.text('body').notNullable()
    table.string('status').notNullable()
    table.text('error')
    table.timestamps(true, true)
  })

  // Insert default notification types
  await knex('notification_types').insert([
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

  // Create indexes
  await knex.raw(
    'CREATE INDEX notifications_user_id_idx ON notifications (user_id)'
  )
  await knex.raw(
    'CREATE INDEX notifications_type_id_idx ON notifications (notification_type_id)'
  )
  await knex.raw(
    'CREATE INDEX notifications_unread_idx ON notifications (user_id) WHERE is_read = false'
  )
  await knex.raw('CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id)')
  await knex.raw('CREATE INDEX email_logs_user_id_idx ON email_logs (user_id)')
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS notifications_unread_idx')
  await knex.raw('DROP INDEX IF EXISTS notifications_user_id_idx')
  await knex.raw('DROP INDEX IF EXISTS notifications_type_id_idx')
  await knex.raw('DROP INDEX IF EXISTS audit_logs_user_id_idx')
  await knex.raw('DROP INDEX IF EXISTS email_logs_user_id_idx')

  await knex.schema.dropTable('email_logs')
  await knex.schema.dropTable('notifications')
  await knex.schema.dropTable('notification_types')
  await knex.schema.dropTable('audit_logs')
}

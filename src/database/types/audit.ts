export interface AuditLogTable {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  old_values: unknown | null
  new_values: unknown | null
  ip_address: string | null
  user_agent: string | null
  created_at?: Date
}

export interface NotificationTypeTable {
  id: string
  name: string
  description: string | null
  template: string
  created_at?: Date
  updated_at?: Date
}

export interface NotificationTable {
  id: string
  user_id: string
  notification_type_id: string
  title: string
  message: string
  data: unknown | null
  read_at: Date | null
  created_at?: Date
  updated_at?: Date
}

export interface EmailLogTable {
  id: string
  user_id: string | null
  email: string
  subject: string
  template: string
  data: unknown | null
  status: string
  sent_at: Date | null
  error_message: string | null
  created_at?: Date
  updated_at?: Date
}

// Export types
export type AuditLog = AuditLogTable
export type NewAuditLog = Omit<AuditLogTable, 'id' | 'created_at'>
export type UpdateAuditLog = Partial<Omit<AuditLogTable, 'id' | 'created_at'>>

export type NotificationType = NotificationTypeTable
export type NewNotificationType = Omit<
  NotificationTypeTable,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateNotificationType = Partial<
  Omit<NotificationTypeTable, 'id' | 'created_at' | 'updated_at'>
>

export type Notification = NotificationTable
export type NewNotification = Omit<
  NotificationTable,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateNotification = Partial<
  Omit<NotificationTable, 'id' | 'created_at' | 'updated_at'>
>

export type EmailLog = EmailLogTable
export type NewEmailLog = Omit<
  EmailLogTable,
  'id' | 'created_at' | 'updated_at'
>
export type UpdateEmailLog = Partial<
  Omit<EmailLogTable, 'id' | 'created_at' | 'updated_at'>
>

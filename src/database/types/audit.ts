import { Selectable, Insertable, Updateable, Generated } from 'kysely'

export interface AuditLogTable {
  id: Generated<string>
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  old_values: unknown | null
  new_values: unknown | null
  ip_address: string | null
  user_agent: string | null
  created_at: Generated<Date>
}

export interface NotificationTypeTable {
  id: Generated<string>
  name: string
  description: string | null
  template: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface NotificationTable {
  id: Generated<string>
  user_id: string
  notification_type_id: string
  title: string
  message: string
  data: unknown | null
  is_read: boolean
  read_at: Date | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface EmailLogTable {
  id: Generated<string>
  user_id: string | null
  email: string
  subject: string
  body: string
  status: string
  error: string | null
  created_at: Generated<Date>
}

export type AuditLog = Selectable<AuditLogTable>
export type NewAuditLog = Insertable<AuditLogTable>
export type UpdateAuditLog = Updateable<AuditLogTable>

export type NotificationType = Selectable<NotificationTypeTable>
export type NewNotificationType = Insertable<NotificationTypeTable>
export type UpdateNotificationType = Updateable<NotificationTypeTable>

export type Notification = Selectable<NotificationTable>
export type NewNotification = Insertable<NotificationTable>
export type UpdateNotification = Updateable<NotificationTable>

export type EmailLog = Selectable<EmailLogTable>
export type NewEmailLog = Insertable<EmailLogTable>
export type UpdateEmailLog = Updateable<EmailLogTable>

import { Selectable, Insertable, Updateable, Generated } from 'kysely'

export interface RoleTable {
  id: Generated<string>
  name: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}
export type Role = Selectable<RoleTable>
export type NewRole = Insertable<RoleTable>
export type UpdateRole = Updateable<RoleTable>

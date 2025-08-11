export interface RoleTable {
  id: string
  name: string
  created_at?: Date
  updated_at?: Date
}

export type Role = RoleTable
export type NewRole = Omit<RoleTable, 'id' | 'created_at' | 'updated_at'>
export type UpdateRole = Partial<
  Omit<RoleTable, 'id' | 'created_at' | 'updated_at'>
>

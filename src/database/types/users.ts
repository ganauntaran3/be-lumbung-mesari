export interface UserTable {
  id: string
  email: string
  fullname: string
  username: string
  password: string
  phone_number: string
  address: string
  status: string
  role_id: string
  deposit_image_url?: string
  created_at?: Date
  updated_at?: Date
}

export type User = UserTable
export type NewUser = Omit<UserTable, 'id' | 'created_at' | 'updated_at'>
export type UpdateUser = Partial<
  Omit<UserTable, 'id' | 'created_at' | 'updated_at'>
>

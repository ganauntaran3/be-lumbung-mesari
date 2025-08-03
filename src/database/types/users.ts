import { Selectable, Insertable, Updateable, Generated } from 'kysely'

export interface UserTable {
  id: Generated<string>
  email: string
  fullname: string
  username: string
  password: string
  phone_number: string
  address: string
  status: string
  role_id: string
  id_card_image: string
  selfie_image: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}
export type User = Selectable<UserTable>
export type NewUser = Insertable<UserTable>
export type UpdateUser = Updateable<UserTable>

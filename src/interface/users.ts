import { Role } from "./roles"

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
  deposit_image_url?: string | null
  otp_code?: string | null
  otp_expires_at?: Date | null
  otp_verified?: boolean
  created_at?: Date
  updated_at?: Date
}

export type NewUser = Omit<UserTable, 'id' | 'created_at' | 'updated_at'>
export type UpdateUser = Partial<
  Omit<UserTable, 'id' | 'created_at' | 'updated_at'>
>
export type User = {
  id: string
  email: string
  fullname: string
  username: string
  password: string
  phone_number: string
  address: string
  status: string
  role_id: string
  deposit_image_url: string | null
  otp_code?: string | null
  otp_expires_at?: Date | null
  otp_verified?: boolean
  created_at: Date
  updated_at: Date
}

/**
 * User data with role information (safe for API responses)
 */
export interface UserWithRole {
  id: string
  email: string
  fullname: string
  username: string
  phone_number: string
  address: string
  status: string
  created_at: Date
  updated_at: Date
  role_name: string
}

/**
 * Paginated users response interface
 */
export interface UsersPaginatedResponse {
  data: UserWithRole[]
  page: number
  limit: number
  totalData: number
  totalPage: number
  next: boolean
  prev: boolean
}


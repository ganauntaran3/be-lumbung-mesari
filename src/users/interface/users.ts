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

export type UpdateUserDto = {
  email?: string
  fullname?: string
  username?: string
  phoneNumber?: string
  password?: string
  address?: string
  status?: string
  roleId?: string
  otpCode?: string | null
  otpVerified?: boolean
  otpExpiresAt?: Date | null
}

export type CreatedUser = {
  email: string
  fullname: string
  username: string
  phoneNumber: string
  password: string
  address: string
  status: string
  roleId: string
  otpCode: string
  otpExpiresAt: Date
}

export interface UpdateUserEntity {
  email?: string
  fullname?: string
  username?: string
  phone_number?: string
  password?: string
  address?: string
  status?: string
  role_id?: string
  otp_code?: string | null
  otp_expires_at?: Date | null
}

export interface UserJWT {
  id: string
  email: string
  username: string
  status: string
  role: string
}

export interface UserResponse {
  id: string
  email: string
  fullname: string
  username: string
  phoneNumber: string
  address: string
  status: string
  createdAt: Date
  updatedAt: Date
  roleId: string
}

/**
 * Paginated users response interface
 */
export interface UsersPaginatedResponse {
  data: UserResponse[]
  page: number
  limit: number
  totalData: number
  totalPage: number
  next: boolean
  prev: boolean
}

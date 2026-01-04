import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsEnum } from 'class-validator'

import { PaginationQueryDto } from '../../database/dto/pagination.dto'

export enum UserStatusFilter {
  WAITING_DEPOSIT = 'waiting_deposit',
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended'
}

export enum UserSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  ID = 'id',
  USERNAME = 'username'
}

export class UsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter by user role(s). Can be a single role or multiple roles separated by commas.',
    enum: ['member', 'administrator', 'superadministrator'],
    example: 'member',
    examples: {
      single: {
        summary: 'Single role',
        value: 'member'
      },
      multiple: {
        summary: 'Multiple roles (for admin management)',
        value: 'administrator,superadministrator'
      }
    }
  })
  @IsOptional()
  @IsString({ message: 'Role must be a string' })
  role?: string

  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatusFilter
  })
  @IsOptional()
  @IsEnum(UserStatusFilter, { message: 'Status must be a valid user status' })
  status?: UserStatusFilter

  @ApiPropertyOptional({
    description: 'Search by name or email',
    example: ''
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string

  @ApiPropertyOptional({
    description: 'Column to sort by',
    enum: UserSortBy,
    default: UserSortBy.CREATED_AT,
    example: UserSortBy.CREATED_AT
  })
  @IsOptional()
  @IsEnum(UserSortBy, {
    message: 'SortBy must be one of: createdAt, updatedAt, id, username'
  })
  sortBy?: UserSortBy
}

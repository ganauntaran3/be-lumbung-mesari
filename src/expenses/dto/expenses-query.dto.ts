import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsPositive,
  IsEnum,
  MaxLength,
  Max
} from 'class-validator'

import { PaginationQueryDto } from '../../database/dto/pagination.dto'
import {
  IsDateRangeValid,
  IsAmountRangeValid,
  IsNotFutureDate
} from '../validators/expense.validators'

export class ExpensesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by expense category code',
    example: 'operational',
    maxLength: 64
  })
  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  @MaxLength(64, { message: 'Category code cannot exceed 64 characters' })
  category?: string

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  @IsOptional()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId?: string

  @ApiPropertyOptional({
    description: 'Start date for filtering (YYYY-MM-DD format)',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Start date must be a valid date string (YYYY-MM-DD)' }
  )
  @IsNotFutureDate({ message: 'Start date cannot be in the future' })
  startDate?: string

  @ApiPropertyOptional({
    description: 'End date for filtering (YYYY-MM-DD format)',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'End date must be a valid date string (YYYY-MM-DD)' }
  )
  @IsNotFutureDate({ message: 'End date cannot be in the future' })
  @IsDateRangeValid('startDate', {
    message: 'End date must be after or equal to start date'
  })
  endDate?: string

  @ApiPropertyOptional({
    description: 'Minimum amount for filtering',
    example: 50000,
    type: Number,
    maximum: 999999999999.9999
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum amount must be a number' })
  @IsPositive({ message: 'Minimum amount must be positive' })
  @Max(999999999999.9999, {
    message: 'Minimum amount cannot exceed 999,999,999,999.9999'
  })
  minAmount?: number

  @ApiPropertyOptional({
    description: 'Maximum amount for filtering',
    example: 500000,
    type: Number,
    maximum: 999999999999.9999
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Maximum amount must be a number' })
  @IsPositive({ message: 'Maximum amount must be positive' })
  @Max(999999999999.9999, {
    message: 'Maximum amount cannot exceed 999,999,999,999.9999'
  })
  @IsAmountRangeValid('minAmount', {
    message: 'Maximum amount must be greater than or equal to minimum amount'
  })
  maxAmount?: number

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['updated_at', 'created_at', 'amount', 'category'],
    example: 'updated_at',
    default: 'updated_at'
  })
  @IsOptional()
  @IsEnum(['updated_at', 'created_at', 'amount', 'category'], {
    message: 'Sort by must be one of: updated_at, created_at, amount, category'
  })
  sortBy?: 'updated_at' | 'created_at' | 'amount' | 'category' = 'updated_at'

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'Sort order must be either asc or desc'
  })
  sortOrder?: 'asc' | 'desc'
}

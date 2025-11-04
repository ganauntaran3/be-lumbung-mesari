import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
  Max
} from 'class-validator'

export class UpdateExpenseDto {
  @ApiPropertyOptional({
    description: 'Expense category ID',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  @IsOptional()
  @IsUUID(4, { message: 'Expense category ID must be a valid UUID' })
  expenseCategoryId?: string

  @ApiPropertyOptional({
    description: 'Expense name/title',
    example: 'Updated Office Supplies Purchase',
    maxLength: 255
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name?: string

  @ApiPropertyOptional({
    description: 'Expense amount (positive number)',
    example: 175000,
    type: Number,
    maximum: 999999999999.9999
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'Amount must be a number with maximum 4 decimal places' }
  )
  @IsPositive({ message: 'Amount must be a positive number' })
  @Max(999999999999.9999, {
    message: 'Amount cannot exceed 999,999,999,999.9999'
  })
  amount?: number

  @ApiPropertyOptional({
    description: 'User ID associated with the expense',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  @IsOptional()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId?: string

  @ApiPropertyOptional({
    description: 'Loan ID associated with the expense',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  @IsOptional()
  @IsUUID(4, { message: 'Loan ID must be a valid UUID' })
  loanId?: string

  @ApiPropertyOptional({
    description: 'Additional notes about the expense',
    example: 'Updated office supplies purchase details',
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters' })
  notes?: string

  @ApiPropertyOptional({
    description: 'Source of funds for the expense',
    enum: ['auto', 'total', 'capital', 'shu'],
    example: 'total'
  })
  @IsOptional()
  @IsEnum(['auto', 'total', 'capital', 'shu'], {
    message: 'Source must be one of: auto, total, capital, shu'
  })
  source?: 'auto' | 'total' | 'capital' | 'shu'
}

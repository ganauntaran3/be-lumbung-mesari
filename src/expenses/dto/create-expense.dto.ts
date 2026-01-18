import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength
} from 'class-validator'

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Expense category ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    required: true
  })
  @IsString()
  @IsNotEmpty({ message: 'Expense category ID is required' })
  expenseCategoryId!: string

  @ApiProperty({
    description: 'Expense name/title',
    example: 'Office Supplies Purchase',
    required: true,
    maxLength: 255
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Expense name is required' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name!: string

  @ApiProperty({
    description: 'Expense amount (positive number)',
    example: 150000,
    type: Number,
    required: true,
    maximum: 999999999999.9999
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'Amount must be a number with maximum 4 decimal places' }
  )
  @IsPositive({ message: 'Amount must be a positive number' })
  @IsNotEmpty({ message: 'Amount is required' })
  @Max(999999999999.9999, {
    message: 'Amount cannot exceed 999,999,999,999.9999'
  })
  amount!: number

  @ApiPropertyOptional({
    description: 'Loan ID associated with the expense',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  @IsOptional()
  @IsString({ message: 'Loan ID must be a valid ID' })
  loanId?: string

  @ApiPropertyOptional({
    description: 'Additional notes about the expense',
    example: 'Office supplies purchase for monthly operations',
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters' })
  notes?: string

  @ApiPropertyOptional({
    description: 'Source of funds for the expense',
    enum: ['auto', 'total', 'capital', 'shu'],
    example: 'auto'
  })
  @IsOptional()
  @IsEnum(['auto', 'total', 'capital', 'shu'], {
    message: 'Source must be one of: auto, total, capital, shu'
  })
  source?: 'auto' | 'total' | 'capital' | 'shu'

  @ApiPropertyOptional({
    description: 'Expense date',
    example: '2023-11-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  transactionDate?: Date
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min
} from 'class-validator'

export class CreateLoanDto {
  @ApiProperty({
    description: 'Loan period ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty({ message: 'Loan period ID is required' })
  @IsUUID('4', { message: 'Loan period ID must be a valid UUID' })
  loanPeriodId!: string

  @ApiProperty({
    description: 'Principal amount requested',
    example: 5000000,
    minimum: 0
  })
  @IsNotEmpty({ message: 'Principal amount is required' })
  @IsNumber({}, { message: 'Principal amount must be a number' })
  @Min(0, { message: 'Principal amount must be greater than 0' })
  principalAmount!: number

  @ApiPropertyOptional({
    description: 'Notes or reason for the loan',
    example: 'Need funds for business expansion',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string
}

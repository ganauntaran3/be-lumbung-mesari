import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator'

export class CalculateLoanRequestDto {
  @ApiProperty({
    description: 'Principal amount to borrow',
    example: 5000000,
    minimum: 1
  })
  @IsNotEmpty({ message: 'Principal amount is required' })
  @IsNumber({}, { message: 'Principal amount must be a number' })
  @IsPositive({ message: 'Principal amount must be positive' })
  amount!: number

  @ApiProperty({
    description: 'Loan period ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid'
  })
  @IsNotEmpty({ message: 'Loan period ID is required' })
  @IsString({ message: 'Loan period ID must be a valid UUID' })
  loanPeriodId!: string
}

export class CalculateLoanResponseDto {
  @ApiProperty({ description: 'Principal amount', example: 5000000 })
  principalAmount!: number

  @ApiProperty({ description: 'Admin fee (2%)', example: 100000 })
  adminFee!: number

  @ApiProperty({
    description: 'Amount to be disbursed to member',
    example: 4900000
  })
  disbursedAmount!: number

  @ApiProperty({ description: 'Loan tenor in months', example: 12 })
  tenor!: number

  @ApiProperty({ description: 'Interest rate per month (%)', example: 1.0 })
  interestRate!: number

  @ApiProperty({ description: 'Monthly interest in IDR', example: 50000 })
  monthlyInterest!: number

  @ApiProperty({
    description: 'Monthly payment amount (rounded)',
    example: 467500
  })
  monthlyPayment!: number

  @ApiPropertyOptional({
    description: 'Last month payment amount (only if different from monthly)',
    example: 467000
  })
  lastMonthlyPayment?: number
}

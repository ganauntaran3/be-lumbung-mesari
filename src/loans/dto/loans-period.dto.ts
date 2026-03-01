import { ApiProperty } from '@nestjs/swagger'

export class LoanPeriodResponseDto {
  @ApiProperty({
    description: 'Loan period ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid'
  })
  id!: string

  @ApiProperty({
    description: 'Tenor',
    example: 12,
    format: 'number'
  })
  tenor!: number

  @ApiProperty({
    description: 'Interest Rate',
    example: 0.01,
    format: 'number'
  })
  interestRate!: number
}

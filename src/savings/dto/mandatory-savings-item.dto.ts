import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UsersSavingsItemDto {
  @ApiProperty({
    description: 'Mandatory savings record ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id!: string

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  userId!: string

  @ApiProperty({
    description: 'Period date for the savings (usually first day of month)',
    example: '2025-01-01T00:00:00.000Z'
  })
  periodDate!: string

  @ApiProperty({
    description: 'Savings amount (decimal string with 4 decimal places)',
    example: '500000.0000'
  })
  amount!: string

  @ApiProperty({
    description: 'Payment status',
    enum: ['due', 'paid', 'overdue'],
    example: 'paid'
  })
  status!: 'due' | 'paid' | 'overdue'

  @ApiPropertyOptional({
    description: 'Timestamp when payment was made (null if unpaid)',
    example: '2025-01-15T08:30:00.000Z',
    nullable: true
  })
  paidAt!: string | null

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2025-01-01T00:00:00.000Z'
  })
  createdAt!: string

  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2025-01-15T08:30:00.000Z'
  })
  updatedAt!: string

  @ApiPropertyOptional({
    description: 'User ID who processed the payment (null if none)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true
  })
  processedBy!: string | null
}

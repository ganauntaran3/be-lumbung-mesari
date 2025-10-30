import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UserInfoDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id!: string

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe'
  })
  fullname!: string

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com'
  })
  email!: string

  @ApiProperty({
    description: 'Username',
    example: 'johndoe'
  })
  username!: string
}

export class ProcessedByUserDto {
  @ApiProperty({
    description: 'Processor user ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id!: string

  @ApiProperty({
    description: 'Processor full name',
    example: 'Admin User'
  })
  fullname!: string
}

export class MandatorySavingsResponseDto {
  @ApiProperty({
    description: 'Mandatory savings record ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id!: string

  @ApiProperty({
    description: 'Period date for the savings',
    example: '2024-10-01'
  })
  periodDate!: Date

  @ApiProperty({
    description: 'Savings amount',
    example: '500000.0000'
  })
  amount!: string

  @ApiProperty({
    description: 'Payment status',
    enum: ['due', 'paid', 'overdue'],
    example: 'due'
  })
  status!: 'due' | 'paid' | 'overdue'

  @ApiPropertyOptional({
    description: 'Date when payment was made',
    example: '2024-10-15',
    nullable: true
  })
  paidAt?: Date

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2024-10-01T00:00:00.000Z'
  })
  createdAt!: Date

  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2024-10-01T00:00:00.000Z'
  })
  updatedAt!: Date

  @ApiProperty({
    description: 'User information',
    type: UserInfoDto
  })
  user!: UserInfoDto

  @ApiPropertyOptional({
    description: 'Information about who processed the payment',
    type: ProcessedByUserDto,
    nullable: true
  })
  processedByUser?: ProcessedByUserDto
}

export class MandatorySavingsPaginatedResponseDto {
  @ApiProperty({
    description: 'Array of mandatory savings records',
    type: [MandatorySavingsResponseDto]
  })
  data!: MandatorySavingsResponseDto[]

  @ApiProperty({
    description: 'Current page number',
    example: 1
  })
  page!: number

  @ApiProperty({
    description: 'Number of items per page',
    example: 10
  })
  limit!: number

  @ApiProperty({
    description: 'Total number of records',
    example: 50
  })
  totalData!: number

  @ApiProperty({
    description: 'Total number of pages',
    example: 5
  })
  totalPage!: number

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true
  })
  next!: boolean

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false
  })
  prev!: boolean
}

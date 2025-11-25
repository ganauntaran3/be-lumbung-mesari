import { ApiProperty } from '@nestjs/swagger'

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  id!: string

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email'
  })
  email!: string

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe'
  })
  fullname!: string

  @ApiProperty({
    description: 'Username',
    example: 'johndoe'
  })
  username!: string

  @ApiProperty({
    description: 'User phone number',
    example: '081234567890'
  })
  phoneNumber!: string

  @ApiProperty({
    description: 'User address',
    example: 'Jakarta, Indonesia'
  })
  address!: string

  @ApiProperty({
    description: 'User account status',
    enum: ['waiting_deposit', 'active', 'pending', 'suspended'],
    example: 'active'
  })
  status!: string

  // NOT USED YET
  // @ApiProperty({
  //   description: 'URL of deposit proof image',
  //   example: 'https://example.com/deposits/image.jpg',
  //   nullable: true
  // })
  // depositImageUrl?: string

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time'
  })
  createdAt!: Date

  @ApiProperty({
    description: 'Account last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time'
  })
  updatedAt!: Date
}

export class UsersPaginatedResponseDto {
  @ApiProperty({
    description: 'Array of user records',
    type: [UserResponseDto]
  })
  data!: UserResponseDto[]

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

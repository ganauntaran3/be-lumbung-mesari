import { ApiProperty } from '@nestjs/swagger'

import { UsersSavingsItemDto } from '../../savings/dto/mandatory-savings-item.dto'

export class MySavingsResponseDto {
  @ApiProperty({
    description: 'List of mandatory savings records for the current user',
    type: UsersSavingsItemDto,
    isArray: true,
    minItems: 0,
    maxItems: 12
  })
  data!: UsersSavingsItemDto[]

  @ApiProperty({
    description: 'The year being returned',
    example: 2025
  })
  year!: number
}

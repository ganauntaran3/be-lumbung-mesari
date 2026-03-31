import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

export class MySavingsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by year (e.g., 2025, 2026). Defaults to current year.',
    example: 2025,
    type: Number
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year must be an integer' })
  @Min(2000, { message: 'Year must be 2000 or later' })
  @Max(2100, { message: 'Year must be 2100 or earlier' })
  year?: number
}

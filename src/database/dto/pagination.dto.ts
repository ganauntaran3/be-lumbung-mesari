import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator'

import { PAGINATION_DEFAULTS } from '../../interface/pagination'

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: PAGINATION_DEFAULTS.page,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = PAGINATION_DEFAULTS.page

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: PAGINATION_DEFAULTS.maxLimit,
    default: PAGINATION_DEFAULTS.limit,
    example: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(PAGINATION_DEFAULTS.maxLimit, {
    message: `Limit must not exceed ${PAGINATION_DEFAULTS.maxLimit}`
  })
  limit?: number = PAGINATION_DEFAULTS.limit

  @ApiPropertyOptional({
    description: 'Column to sort by',
    default: PAGINATION_DEFAULTS.sortBy,
    example: 'created_at'
  })
  @IsOptional()
  @IsString({ message: 'SortBy must be a string' })
  sortBy?: string = PAGINATION_DEFAULTS.sortBy

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: PAGINATION_DEFAULTS.sortOrder,
    example: 'desc'
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'SortOrder must be either "asc" or "desc"'
  })
  sortOrder?: 'asc' | 'desc' = PAGINATION_DEFAULTS.sortOrder
}

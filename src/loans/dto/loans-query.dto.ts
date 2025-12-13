import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Min, IsIn } from 'class-validator'

export enum LoanSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  ID = 'id',
  STATUS = 'status',
  PRINCIPAL_AMOUNT = 'principalAmount'
}

export class LoansQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 10

  @ApiPropertyOptional({
    description: 'Filter by loan status',
    example: 'pending',
    enum: ['pending', 'approved', 'rejected', 'active', 'completed']
  })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'active', 'completed'], {
    message:
      'Status must be one of: pending, approved, rejected, active, completed'
  })
  status?: string

  @ApiPropertyOptional({
    description: 'Search by user name or loan ID',
    example: 'John Doe'
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string

  @ApiPropertyOptional({
    description: 'Column to sort by',
    enum: LoanSortBy,
    default: LoanSortBy.CREATED_AT,
    example: LoanSortBy.CREATED_AT
  })
  @IsOptional()
  @IsEnum(LoanSortBy, {
    message:
      'SortBy must be one of: createdAt, updatedAt, id, status, principalAmount'
  })
  sortBy?: LoanSortBy = LoanSortBy.CREATED_AT

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc'
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'SortOrder must be either "asc" or "desc"'
  })
  sortOrder?: 'asc' | 'desc' = 'desc'
}

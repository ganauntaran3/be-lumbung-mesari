import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'

import { PaginationQueryDto } from '../../database/dto/pagination.dto'

export enum LoanSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  ID = 'id',
  STATUS = 'status',
  PRINCIPAL_AMOUNT = 'principalAmount'
}

export class LoansQueryDto extends PaginationQueryDto {
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
  override sortBy?: string = LoanSortBy.CREATED_AT
}

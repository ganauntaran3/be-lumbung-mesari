import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { PaginationResult } from '../../interface/pagination'

export class ExpenseCategoryResponseDto {
  @ApiProperty({
    description: 'Category ID',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  id!: string

  @ApiProperty({
    description: 'Category code',
    example: 'operational'
  })
  code!: string

  @ApiProperty({
    description: 'Category name',
    example: 'Biaya Operasional'
  })
  name!: string

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Expenses for daily operational activities'
  })
  description?: string

  @ApiProperty({
    description: 'Default source for this category',
    enum: ['auto', 'total', 'capital', 'shu'],
    example: 'auto'
  })
  defaultSource!: 'auto' | 'total' | 'capital' | 'shu'
}

export class ExpenseResponseDto {
  @ApiProperty({
    description: 'Expense ID',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  id!: string

  @ApiProperty({
    description: 'Expense category ID',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  expenseCategoryId!: string

  @ApiProperty({
    description: 'Expense amount',
    example: 150000,
    type: Number
  })
  amount!: number

  @ApiPropertyOptional({
    description: 'User ID associated with the expense',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  userId?: string

  @ApiPropertyOptional({
    description: 'Loan ID associated with the expense',
    example: '01234567-89ab-cdef-0123-456789abcdef'
  })
  loanId?: string

  @ApiPropertyOptional({
    description: 'Additional notes about the expense',
    example: 'Office supplies purchase for monthly operations'
  })
  notes?: string

  @ApiPropertyOptional({
    description: 'Source of funds for the expense',
    enum: ['auto', 'total', 'capital', 'shu'],
    example: 'auto'
  })
  source?: 'auto' | 'total' | 'capital' | 'shu'

  @ApiProperty({
    description: 'Expense creation timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt!: Date

  @ApiProperty({
    description: 'Expense last update timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  updatedAt!: Date

  @ApiProperty({
    description: 'Expense category information',
    type: ExpenseCategoryResponseDto
  })
  category!: ExpenseCategoryResponseDto
}

export class ExpensesPaginatedResponseDto
  implements PaginationResult<ExpenseResponseDto>
{
  @ApiProperty({
    description: 'Array of expense records',
    type: [ExpenseResponseDto]
  })
  data!: ExpenseResponseDto[]

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
    description: 'Total number of expense records',
    example: 25
  })
  totalData!: number

  @ApiProperty({
    description: 'Total number of pages',
    example: 3
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

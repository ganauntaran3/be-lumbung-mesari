import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, Min } from 'class-validator'

export class GetTransactionsQueryDto {
  @ApiProperty({ description: 'Page number', example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiProperty({ description: 'Items per page', example: 10, required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10
}

export class TransactionCategoryDto {
  @ApiProperty({ description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string

  @ApiProperty({ description: 'Category code', example: 'INC-001' })
  code!: string

  @ApiProperty({ description: 'Category name', example: 'Simpanan Wajib' })
  name!: string
}

export class CashbookTransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string

  @ApiProperty({ description: 'Transaction date', example: '2026-03-19T00:00:00.000Z', format: 'date-time' })
  txnDate!: Date

  @ApiProperty({ description: 'Transaction type', enum: ['income', 'expense'], example: 'income' })
  type!: 'income' | 'expense'

  @ApiProperty({ description: 'Capital amount', example: 500000 })
  capitalAmount!: number

  @ApiProperty({ description: 'SHU amount', example: 200000 })
  shuAmount!: number

  @ApiProperty({ description: 'Total balance after transaction', example: 12000000 })
  totalBalanceAfter!: number

  @ApiProperty({ description: 'Transaction category', type: TransactionCategoryDto })
  category!: TransactionCategoryDto

  @ApiProperty({ description: 'Created at', example: '2026-03-19T00:00:00.000Z', format: 'date-time' })
  createdAt!: Date
}

export class CashbookTransactionsPaginatedResponseDto {
  @ApiProperty({ description: 'Array of transactions', type: [CashbookTransactionResponseDto] })
  data!: CashbookTransactionResponseDto[]

  @ApiProperty({ description: 'Current page number', example: 1 })
  page!: number

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit!: number

  @ApiProperty({ description: 'Total number of records', example: 50 })
  totalData!: number

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPage!: number

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  next!: boolean

  @ApiProperty({ description: 'Whether there is a previous page', example: false })
  prev!: boolean
}

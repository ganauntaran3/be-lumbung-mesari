import { IsOptional, IsString, Matches, IsInt, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { PaginationQueryDto } from '../../database/dto/pagination.dto'

/**
 * DTO for savings query parameters including pagination and filtering
 */
export class SavingsQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by period (month name in English) - uses current year by default',
        enum: [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ],
        example: 'october',
    })
    @IsOptional()
    @IsString({ message: 'Period must be a string' })
    @Matches(
        /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i,
        { message: 'Period must be a valid month name in English (e.g., january, february, etc.)' }
    )
    period?: string

    @ApiPropertyOptional({
        description: 'Filter by year (e.g., 2025, 2026). Use with period parameter to get specific month/year combination. If not provided, uses current year.',
        example: 2025,
        type: Number,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Year must be an integer' })
    @Min(2000, { message: 'Year must be 2000 or later' })
    @Max(2100, { message: 'Year must be 2100 or earlier' })
    year?: number
}
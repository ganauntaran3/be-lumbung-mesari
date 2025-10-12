import { IsOptional, IsString, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationQueryDto } from '../../database/dto/pagination.dto'

/**
 * DTO for savings query parameters including pagination and filtering
 */
export class SavingsQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by period (month name in English)',
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
}
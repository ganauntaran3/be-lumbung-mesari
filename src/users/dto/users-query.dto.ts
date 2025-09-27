import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../database/dto/pagination.dto';

/**
 * DTO for users query parameters including pagination and filtering
 */
export class UsersQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by user role',
        enum: ['member', 'administrator', 'superadministrator'],
        example: 'member',
    })
    @IsOptional()
    @IsString({ message: 'Role must be a string' })
    role?: string;
}
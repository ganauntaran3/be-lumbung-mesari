import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../database/dto/pagination.dto';

export enum UserStatusFilter {
    WAITING_DEPOSIT = 'waiting_deposit',
    PENDING = 'pending',
    ACTIVE = 'active',
    SUSPENDED = 'suspended'
}

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

    @ApiPropertyOptional({
        description: 'Filter by user status',
        enum: UserStatusFilter,
        example: UserStatusFilter.PENDING
    })
    @IsOptional()
    @IsEnum(UserStatusFilter, { message: 'Status must be a valid user status' })
    status?: UserStatusFilter;

    @ApiPropertyOptional({
        description: 'Search by name or email',
        example: 'john doe'
    })
    @IsOptional()
    @IsString({ message: 'Search must be a string' })
    search?: string;
}
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApprovalAction {
    APPROVE = 'approve',
    REJECT = 'reject'
}

export class ApproveUserDto {
    @ApiProperty({
        description: 'Action to perform on the user',
        enum: ApprovalAction,
        example: ApprovalAction.APPROVE
    })
    @IsEnum(ApprovalAction, { message: 'Action must be either approve or reject' })
    action!: ApprovalAction;

    @ApiPropertyOptional({
        description: 'Optional reason for the action (mainly for rejection)',
        example: 'Deposit proof image is not clear',
        maxLength: 500
    })
    @IsOptional()
    @IsString({ message: 'Reason must be a string' })
    @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
    reason?: string;
}

export class ApprovalResponseDto {
    @ApiProperty({
        description: 'Success message',
        example: 'User approved successfully'
    })
    message!: string;

    @ApiProperty({
        description: 'Updated user status',
        example: 'active'
    })
    status!: string;

    @ApiProperty({
        description: 'User ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    userId!: string;
}
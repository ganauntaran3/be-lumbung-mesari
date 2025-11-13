import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject'
}

export class ApproveUserDto {
  @ApiPropertyOptional({
    description: 'Optional reason for the acceptance action',
    example: 'Deposit proof image is not clear',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string
}

export class RejectUserQueryDto {
  @ApiProperty({
    description: 'Reason for the rejection action (mainly for rejection)',
    example: 'Deposit proof image is not clear',
    maxLength: 500
  })
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string
}

export class ApprovalResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'User approved successfully'
  })
  message!: string

  @ApiProperty({
    description: 'Updated user status',
    example: 'active'
  })
  status!: string

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  userId!: string

  @ApiPropertyOptional({
    description: 'Warning message if email notification failed',
    example: 'Email notification could not be sent'
  })
  warning?: string
}

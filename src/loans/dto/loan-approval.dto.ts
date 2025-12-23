import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class ApproveLoanDto {
  @ApiPropertyOptional({
    description: 'Optional notes for the approval',
    example: 'Approved after verification',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  notes?: string
}

export class RejectLoanDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Insufficient credit history',
    maxLength: 500
  })
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason!: string
}

export class LoanApprovalResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Loan approved successfully'
  })
  message!: string

  @ApiProperty({
    description: 'Updated loan status',
    example: 'approved'
  })
  status!: string

  @ApiProperty({
    description: 'Loan ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  loanId!: string
}

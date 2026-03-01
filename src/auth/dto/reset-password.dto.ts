import { ApiProperty } from '@nestjs/swagger'

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength
} from 'class-validator'

export class RequestResetPasswordDto {
  @ApiProperty({
    description: 'Registered email address',
    example: 'john.doe@example.com'
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email = ''
}

export class ConfirmResetPasswordDto {
  @ApiProperty({ description: 'Password reset token received via email' })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Invalid token format' })
  token = ''

  @ApiProperty({
    description: 'New password (min 8 chars, must contain uppercase)'
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter'
  })
  newPassword = ''

  @ApiProperty({ description: 'Must match newPassword' })
  @IsString()
  @IsNotEmpty()
  confirmPassword = ''
}

export class RequestResetPasswordResponseDto {
  @ApiProperty({ example: 'Reset link sent to your email.' })
  message = ''
}

export class ConfirmResetPasswordResponseDto {
  @ApiProperty({ example: 'Password updated successfully.' })
  message = ''
}

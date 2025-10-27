import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty } from 'class-validator'

export class LoginRequestDto {
  @ApiProperty({
    description: 'Email or Username',
    example: 'admin@lumbungmesari.com',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  identifier = ''

  @ApiProperty({
    description: 'Password',
    example: 'admin123',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  password = ''
}

export class TokenDto {
  @ApiProperty({
    description: 'JWT access token for authentication',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi0wMDEiLCJlbWFpbCI6ImFkbWluQGx1bWJ1bmdtZXNhcmkuY29tIiwicm9sZSI6ImFkbWluaXN0cmF0b3IiLCJpYXQiOjE3MDQwNjcyMDAsImV4cCI6MTcwNDA3MDgwMH0.example'
  })
  accessToken = ''

  @ApiProperty({
    description: 'JWT refresh token for token renewal',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi0wMDEiLCJlbWFpbCI6ImFkbWluQGx1bWJ1bmdtZXNhcmkuY29tIiwicm9sZSI6ImFkbWluaXN0cmF0b3IiLCJpYXQiOjE3MDQwNjcyMDAsImV4cCI6MTcwNDY3MjAwMH0.example'
  })
  refreshToken = ''
}

export class LoginDataResponse {
  @ApiProperty({
    description: 'Indicates if OTP was sent (only for pending users)',
  })
  status!: string

  @ApiProperty({
    description: 'Indicates if OTP was sent (only for pending users)',
  })
  emailSent!: boolean

  @ApiProperty({
    description: 'Additional message.',
    example: 'Login successful. A new OTP has been sent to your email for verification.',
  })
  message!: string

}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Authentication tokens',
    type: TokenDto
  })
  token!: TokenDto

  @ApiProperty({
    description: 'Indicates if OTP was sent (only for pending users)',
    type: LoginDataResponse
  })
  data!: LoginDataResponse
}

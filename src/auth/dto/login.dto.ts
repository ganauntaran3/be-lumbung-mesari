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
  access_token = ''

  @ApiProperty({
    description: 'JWT refresh token for token renewal',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi0wMDEiLCJlbWFpbCI6ImFkbWluQGx1bWJ1bmdtZXNhcmkuY29tIiwicm9sZSI6ImFkbWluaXN0cmF0b3IiLCJpYXQiOjE3MDQwNjcyMDAsImV4cCI6MTcwNDY3MjAwMH0.example'
  })
  refresh_token = ''
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Authentication tokens',
    type: TokenDto
  })
  token!: TokenDto
}

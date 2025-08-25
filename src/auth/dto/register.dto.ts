import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    type: String,
    required: true
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @ApiProperty({
    example: 'password123',
    description: 'User password (minimum 6 characters)',
    type: String,
    minLength: 6,
    required: true
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password!: string

  @ApiProperty({
    example: 'John',
    description: 'User first name',
    type: String,
    required: true
  })
  @IsString()
  @IsNotEmpty()
  firstName!: string

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    type: String,
    required: true
  })
  @IsString()
  @IsNotEmpty()
  lastName!: string
}

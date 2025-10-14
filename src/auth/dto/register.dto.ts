import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator'

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    type: String,
    required: true
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string

  @ApiProperty({
    example: 'Password123!',
    description: 'User password (minimum 8 characters, must contain uppercase letter)',
    type: String,
    minLength: 8,
    required: true
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
  @IsNotEmpty({ message: 'Password is required' })
  password!: string

  @ApiProperty({
    example: 'Password123!',
    description: 'Password confirmation (must match password)',
    type: String,
    required: true
  })
  @IsString({ message: 'Password confirmation must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  passwordConfirmation!: string

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    type: String,
    required: true
  })
  @IsString({ message: 'Full name must be a string' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @IsNotEmpty({ message: 'Full name is required' })
  fullname!: string

  @ApiProperty({
    example: 'johndoe',
    description: 'Unique username (minimum 3 characters, alphanumeric only)',
    type: String,
    required: true
  })
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Matches(/^[a-zA-Z0-9]+$/, { message: 'Username must contain only letters and numbers' })
  @IsNotEmpty({ message: 'Username is required' })
  username!: string

  @ApiProperty({
    example: '081234567890',
    description: 'Indonesian phone number (format: 08xxxxxxxxx or +628xxxxxxxxx)',
    type: String,
    required: true
  })
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, {
    message: 'Please provide a valid Indonesian phone number (e.g., 081234567890 or +6281234567890)'
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  phone_number!: string

  @ApiProperty({
    example: 'Jl. Merdeka No. 123, Jakarta Pusat, DKI Jakarta',
    description: 'Complete address (minimum 10 characters)',
    type: String,
    required: true
  })
  @IsString({ message: 'Address must be a string' })
  @MinLength(10, { message: 'Address must be at least 10 characters long' })
  @IsNotEmpty({ message: 'Address is required' })
  address!: string


}

export class RegisterResponseDto {
  @ApiProperty({
    example: {
      id: 'uuid-v4-string',
      email: 'user@example.com',
      fullname: 'John Doe',
      username: 'johndoe',
      status: 'pending'
    },
    description: 'User information after registration (Step 1). Status is "pending" until OTP verification.'
  })
  user!: {
    id: string
    email: string
    fullname: string
    username: string
    status: string
  }

  @ApiProperty({
    example: 'Registration successful. Please check your email for OTP verification code.',
    description: 'Success message with next steps for the user'
  })
  message!: string

  @ApiProperty({
    example: true,
    description: 'Indicates whether OTP email was sent successfully'
  })
  otp_sent!: boolean
}
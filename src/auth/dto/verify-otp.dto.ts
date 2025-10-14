import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator'

export class VerifyOtpDto {
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
        example: '123456',
        description: '6-digit OTP code received via email',
        type: String,
        required: true
    })
    @IsString({ message: 'OTP code must be a string' })
    @Matches(/^\d{6}$/, { message: 'OTP code must be exactly 6 digits' })
    @IsNotEmpty({ message: 'OTP code is required' })
    otp_code!: string
}

export class VerifyOtpResponseDto {
    @ApiProperty({
        example: {
            id: 'uuid-string',
            email: 'user@example.com',
            fullname: 'John Doe',
            username: 'johndoe',
            status: 'waiting_deposit'
        },
        description: 'User information after OTP verification'
    })
    user!: {
        id: string
        email: string
        fullname: string
        username: string
        status: string
    }

    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT access token for authentication'
    })
    access_token!: string

    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT refresh token'
    })
    refresh_token!: string

    @ApiProperty({
        example: 'OTP verified successfully. Please submit your deposit proof to complete registration.',
        description: 'Success message with next steps'
    })
    message!: string
}
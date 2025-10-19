import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class VerifyOtpDto {
    @ApiProperty({
        example: '123456',
        description: '6-digit OTP code received via email',
        type: String,
        required: true
    })
    @IsString({ message: 'OTP code must be a string' })
    @Matches(/^\d{6}$/, { message: 'OTP code must be exactly 6 digits' })
    @IsNotEmpty({ message: 'OTP code is required' })
    otpCode!: string
}

class TokenDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT access token (1 hour expiry after verification)'
    })
    accessToken!: string

    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT refresh token (1 day expiry)'
    })
    refreshToken!: string
}

export class VerifyOtpResponseDto {
    @ApiProperty({
        description: 'Authentication tokens',
        type: TokenDto
    })
    token!: TokenDto

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
        example: 'OTP verified successfully. Please submit your deposit proof to complete registration.',
        description: 'Success message with next steps'
    })
    message!: string
}
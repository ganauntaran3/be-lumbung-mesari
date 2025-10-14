import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty } from 'class-validator'

export class ResendOtpDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'User email address',
        type: String,
        required: true
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string
}

export class ResendOtpResponseDto {
    @ApiProperty({
        example: 'New OTP has been sent to your email.',
        description: 'Success message'
    })
    message!: string

    @ApiProperty({
        example: true,
        description: 'Indicates OTP was sent successfully'
    })
    otp_sent!: boolean
}
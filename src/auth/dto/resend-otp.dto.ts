import { ApiProperty } from '@nestjs/swagger'

// No body required - user info extracted from JWT token
export class ResendOtpDto { }

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
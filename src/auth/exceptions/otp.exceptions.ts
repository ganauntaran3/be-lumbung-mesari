import { BadRequestException, GoneException, HttpStatus } from '@nestjs/common'

export class OtpExpiredException extends GoneException {
    constructor() {
        super({
            message: 'OTP has expired. Please request a new one.',
            error: 'OTP_EXPIRED',
            statusCode: HttpStatus.GONE
        })
    }
}

export class InvalidOtpException extends BadRequestException {
    constructor() {
        super({
            message: 'Invalid OTP code. Please check and try again.',
            error: 'INVALID_OTP',
            statusCode: HttpStatus.BAD_REQUEST
        })
    }
}

export class OtpAlreadyVerifiedException extends BadRequestException {
    constructor() {
        super({
            message: 'OTP has already been verified.',
            error: 'OTP_ALREADY_VERIFIED',
            statusCode: HttpStatus.CONFLICT
        })
    }
}

export class NoOtpFoundException extends BadRequestException {
    constructor() {
        super({
            message: 'No OTP found for this user. Please request a new one.',
            error: 'NO_OTP_FOUND',
            statusCode: HttpStatus.BAD_REQUEST
        })
    }
}

export class UserNotInPendingStatusException extends BadRequestException {
    constructor() {
        super({
            message: 'User is not in pending verification status.',
            error: 'USER_NOT_PENDING',
            statusCode: HttpStatus.BAD_REQUEST
        })
    }
}

export class OtpSendFailedException extends BadRequestException {
    constructor(message?: string) {
        super({
            message: message || 'Failed to send OTP verification email. Please try again.',
            error: 'OTP_SEND_FAILED',
            statusCode: HttpStatus.BAD_REQUEST
        })
    }
}

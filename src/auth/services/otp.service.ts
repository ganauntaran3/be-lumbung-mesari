import { Injectable } from '@nestjs/common'
import { randomInt } from 'crypto'

@Injectable()
export class OtpService {
    generateOtp(): string {
        return randomInt(100000, 999999).toString()
    }

    getOtpExpirationTime(): Date {
        const expirationTime = new Date()
        expirationTime.setMinutes(expirationTime.getMinutes() + 5)
        return expirationTime
    }

    isOtpExpired(expiresAt: Date): boolean {
        return new Date() > expiresAt
    }

    isValidOtpFormat(otp: string): boolean {
        return /^\d{6}$/.test(otp)
    }
}
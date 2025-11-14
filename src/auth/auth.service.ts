import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcrypt'

import { UserRole, UserStatus } from '../common/constants'
import { DatabaseService } from '../database/database.service'
import { JwtPayload } from '../interface/jwt'
import {
  EmailData,
  EmailHelperService,
  NotificationTemplate
} from '../notifications/email/email-helper.service'
import { UserDataToken } from '../users/interface/users'
import { UsersService } from '../users/users.service'
import { UsersSavingsService } from '../users-savings/users-savings.service'

import { LoginRequestDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import {
  InvalidOtpException,
  NoOtpFoundException,
  OtpAlreadyVerifiedException,
  OtpExpiredException,
  UserNotInPendingStatusException
} from './exceptions/otp.exceptions'
import { OtpService } from './services/otp.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailHelperService: EmailHelperService,
    private readonly otpService: OtpService,
    private readonly usersSavingsService: UsersSavingsService,
    private readonly databaseService: DatabaseService
  ) {}

  async login(loginDto: LoginRequestDto) {
    const { identifier, password: inputPassword } = loginDto
    const user = await this.usersService.findByIdentifierWithRole(identifier)

    if (!user) {
      throw new NotFoundException('User not found!')
    }

    if (!(await compare(inputPassword, user.password))) {
      throw new UnauthorizedException('Invalid credentials!')
    }

    let emailSent = false
    let message = ''
    if (user.status === UserStatus.PENDING) {
      this.logger.log(
        `User ${user.email} is pending, generating new OTP for login`
      )

      const otpCode = this.otpService.generateOtp()
      const otpExpiresAt = this.otpService.getOtpExpirationTime()

      await this.usersService.update(user.id, {
        otpCode,
        otpExpiresAt
      })

      emailSent = await this.sendOtpVerificationEmail(user, otpCode)
      message = emailSent
        ? 'Login success!. A new OTP has been sent to your email'
        : 'Unable to send OTP!'

      this.logger.log(
        `New OTP generated for pending user ${user.email} - email sent: ${emailSent}`
      )
    } else {
      this.logger.log(`Logged In: ${user.email}`)
      message = 'Login success!'
    }

    const tokens = this.generateTokens(user)

    return {
      ...tokens,
      data: {
        status: user.status,
        emailSent: emailSent,
        message: message
      }
    }
  }

  async register(registerDto: RegisterDto) {
    if (registerDto.password !== registerDto.passwordConfirmation) {
      throw new BadRequestException('Password confirmation does not match')
    }

    try {
      const hashedPassword = await hash(registerDto.password, 10)
      const { passwordConfirmation, ...registerData } = registerDto

      const otpCode = this.otpService.generateOtp()
      const otpExpiresAt = this.otpService.getOtpExpirationTime()

      const user = await this.usersService.create({
        ...registerData,
        password: hashedPassword,
        status: UserStatus.PENDING,
        roleId: UserRole.MEMBER,
        otpCode,
        otpExpiresAt
      })

      this.logger.log(`Registration trial: ${user.email}`)
      const emailSent = await this.sendOtpVerificationEmail(user, otpCode)
      const tokens = this.generateTokens(user)

      return {
        ...tokens,
        data: {
          id: user.id,
          email: user.email,
          fullname: user.fullname,
          username: user.username,
          status: user.status
        },
        message: emailSent
          ? 'Registration successful. Please check your email for OTP verification code.'
          : 'Registration successful. However, we could not send the OTP email. Please try resending the OTP.',
        otpSent: emailSent
      }
    } catch (error) {
      this.logger.error(
        `Registration failed for ${registerDto.email} (${registerDto.username}): ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      throw error
    }
  }

  async verifyOtp(userId: string, otpCode: string) {
    if (!this.otpService.isValidOtpFormat(otpCode)) {
      throw new InvalidOtpException()
    }

    const user = await this.usersService.findByIdIncludeOtp(userId)
    if (!user) {
      throw new NotFoundException('User not found.')
    }

    if (user.status !== UserStatus.PENDING) {
      throw new UserNotInPendingStatusException()
    }

    if (user.otp_verified) {
      throw new OtpAlreadyVerifiedException()
    }

    if (!user.otp_code) {
      throw new NoOtpFoundException()
    }

    if (
      user.otp_expires_at &&
      this.otpService.isOtpExpired(new Date(user.otp_expires_at))
    ) {
      throw new OtpExpiredException()
    }

    if (user.otp_code !== otpCode) {
      this.logger.warn(
        `Failed OTP verification attempt for user ${userId} - invalid code provided`
      )
      throw new InvalidOtpException()
    }

    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      const updatedUser = await this.usersService.update(
        user.id,
        {
          status: UserStatus.WAITING_DEPOSIT,
          otpVerified: true,
          otpCode: null,
          otpExpiresAt: null
        },
        trx
      )

      this.logger.log(
        `OTP verified successfully for user ${userId} - user status changed from ${UserStatus.PENDING} to ${UserStatus.WAITING_DEPOSIT}`
      )

      await this.usersSavingsService.createPrincipalSavings(userId, trx)
      this.logger.log(`Principal savings created for user ${userId}`)
      await trx.commit()

      const userData = {
        id: updatedUser.id,
        email: updatedUser.email,
        fullname: updatedUser.fullname,
        username: updatedUser.username,
        status: updatedUser.status,
        role_id: updatedUser.role_id
      }

      return {
        ...this.generateTokens(userData),
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullname: updatedUser.fullname,
          username: updatedUser.username,
          status: updatedUser.status
        },
        message: 'OTP verified successfully!'
      }
    } catch (error) {
      // Rollback transaction on any error
      await trx.rollback()
      this.logger.error(
        `Transaction failed during OTP verification for user ${userId}:`,
        error
      )
      throw new BadRequestException('Failed to verify OTP. Please try again.')
    }
  }

  async resendOtp(userId: string) {
    const user = await this.usersService.findByIdIncludeOtp(userId)
    if (!user) {
      throw new NotFoundException('User not found.')
    }

    if (user.status !== UserStatus.PENDING) {
      throw new UserNotInPendingStatusException()
    }

    if (user.otp_verified) {
      throw new OtpAlreadyVerifiedException()
    }

    const otpCode = this.otpService.generateOtp()
    const otpExpiresAt = this.otpService.getOtpExpirationTime()

    await this.usersService.update(user.id, {
      otpCode: otpCode,
      otpExpiresAt: otpExpiresAt
    })

    const emailSent = await this.sendOtpVerificationEmail(user, otpCode)

    this.logger.log(
      `OTP resent for user ${userId} - ${emailSent ? 'email sent successfully' : 'email sending failed'}`
    )

    return {
      message: emailSent
        ? 'New OTP has been sent to your email.'
        : 'OTP has been generated but could not be sent via email. Please contact support.',
      otpSent: emailSent
    }
  }

  async refreshToken(user: any) {
    return this.generateTokens(user)
  }

  private generateTokens(user: UserDataToken) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roleId: user.role_id || 'member',
      status: user.status || UserStatus.PENDING
    }

    const accessTokenExpiry = user.status === UserStatus.PENDING ? '10m' : '1h'

    return {
      token: {
        accessToken: this.jwtService.sign(payload, {
          expiresIn: accessTokenExpiry
        }),
        refreshToken: this.jwtService.sign(payload, { expiresIn: '1d' })
      }
    }
  }

  private async sendOtpVerificationEmail(
    user: any,
    otpCode: string
  ): Promise<boolean> {
    try {
      const emailData: EmailData = {
        template: NotificationTemplate.OTP_VERIFICATION,
        recipient: user.email,
        data: {
          fullname: user.fullname,
          email: user.email,
          otp_code: otpCode
        },
        priority: 'high'
      }

      await this.emailHelperService.sendEmail(emailData)

      this.logger.log(
        `OTP verification email sent successfully to ${user.email}`
      )
      return true
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${user.email}:`, error)
      this.logger.warn(
        `OTP email delivery failed for ${user.email} - user can request resend`
      )

      return false
    }
  }
}

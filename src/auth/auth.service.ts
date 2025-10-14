import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcrypt'
import { UsersService } from '../users/users.service'
import { LoginRequestDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtPayload } from '../interface/jwt'
import { EmailHelperService, NotificationTemplate, EmailData } from '../notifications/email/email-helper.service'
import { OtpService } from './services/otp.service'

import {
  OtpExpiredException,
  InvalidOtpException,
  OtpAlreadyVerifiedException,
  NoOtpFoundException,
  UserNotInPendingStatusException
} from './exceptions/otp.exceptions'

export enum UserStatus {
  WAITING_DEPOSIT = 'waiting_deposit',
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected'
}


export interface StatusTransition {
  from: UserStatus;
  to: UserStatus;
  requiredRole: string[];
  requiresReason?: boolean;
}

export const STATUS_TRANSITIONS: StatusTransition[] = [
  { from: UserStatus.PENDING, to: UserStatus.WAITING_DEPOSIT, requiredRole: ['member', 'system'] },
  { from: UserStatus.WAITING_DEPOSIT, to: UserStatus.PENDING, requiredRole: ['member'] },
  { from: UserStatus.PENDING, to: UserStatus.ACTIVE, requiredRole: ['administrator', 'superadministrator'] },
  { from: UserStatus.PENDING, to: UserStatus.WAITING_DEPOSIT, requiredRole: ['administrator', 'superadministrator'], requiresReason: true },
  { from: UserStatus.ACTIVE, to: UserStatus.SUSPENDED, requiredRole: ['administrator', 'superadministrator'], requiresReason: true },
  { from: UserStatus.SUSPENDED, to: UserStatus.ACTIVE, requiredRole: ['administrator', 'superadministrator'] }
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailHelperService: EmailHelperService,
    private otpService: OtpService
  ) { }

  private async validateUserUniqueness(email: string, username: string): Promise<void> {
    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
      this.usersService.findByEmail(email),
      this.usersService.findByUsername(username)
    ]);

    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }
  }

  async login(loginDto: LoginRequestDto) {
    const { identifier, password: inputPassword } = loginDto
    const user = await this.usersService.findByIdentifierWithRole(identifier)

    if (!user) {
      throw new NotFoundException('User not found!')
    }
    if (!await compare(inputPassword, user.password)) {
      throw new UnauthorizedException('Invalid credentials!')
    }

    const { password, ...result } = user
    return this.generateTokens(result)
  }

  async register(registerDto: RegisterDto) {
    if (registerDto.password !== registerDto.passwordConfirmation) {
      throw new BadRequestException('Password confirmation does not match');
    }

    try {
      await this.validateUserUniqueness(registerDto.email, registerDto.username);

      const hashedPassword = await hash(registerDto.password, 10);

      const otpCode = this.otpService.generateOtp();
      const otpExpiresAt = this.otpService.getOtpExpirationTime();

      const user = await this.usersService.create({
        email: registerDto.email,
        password: hashedPassword,
        fullname: registerDto.fullname,
        username: registerDto.username,
        phone_number: registerDto.phone_number,
        address: registerDto.address,
        status: UserStatus.PENDING,
        role_id: 'member',
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        otp_verified: false
      });

      this.logger.log(`Registration trial: ${user.email}`);
      const emailSent = await this.sendOtpVerificationEmail(user, otpCode);

      return {
        user: {
          id: user.id,
          email: user.email,
          fullname: user.fullname,
          username: user.username,
          status: user.status
        },
        message: emailSent
          ? 'Registration successful. Please check your email for OTP verification code.'
          : 'Registration successful. However, we could not send the OTP email. Please try resending the OTP.',
        otp_sent: emailSent
      };
    } catch (error) {
      this.logger.error(`Registration failed for ${registerDto.email} (${registerDto.username}): ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error;
    }
  }

  async verifyOtp(email: string, otpCode: string) {
    if (!this.otpService.isValidOtpFormat(otpCode)) {
      throw new InvalidOtpException();
    }

    const user = await this.usersService.findByEmailWithRole(email);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new UserNotInPendingStatusException();
    }

    if (user.otp_verified) {
      throw new OtpAlreadyVerifiedException();
    }

    if (!user.otp_code) {
      throw new NoOtpFoundException();
    }

    if (user.otp_expires_at && this.otpService.isOtpExpired(new Date(user.otp_expires_at))) {
      throw new OtpExpiredException();
    }

    if (user.otp_code !== otpCode) {
      this.logger.warn(`Failed OTP verification attempt for ${email} - invalid code provided`)
      throw new InvalidOtpException();
    }

    const updatedUser = await this.usersService.update(user.id, {
      status: UserStatus.WAITING_DEPOSIT,
      otp_verified: true,
      otp_code: null,
      otp_expires_at: null
    });

    this.logger.log(`OTP verified successfully for ${email} - user status changed from ${UserStatus.PENDING} to ${UserStatus.WAITING_DEPOSIT}`)

    await this.sendRegistrationNotifications(updatedUser, UserStatus.WAITING_DEPOSIT);

    const userWithRole = await this.usersService.findByEmailWithRole(user.email);

    return {
      ...this.generateTokens(userWithRole),
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullname: updatedUser.fullname,
        username: updatedUser.username,
        status: updatedUser.status
      },
      message: 'OTP verified successfully. Please submit your deposit proof to complete registration.'
    };
  }

  async resendOtp(email: string) {
    const user = await this.usersService.findByEmailWithRole(email);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Check if user is in pending status
    if (user.status !== UserStatus.PENDING) {
      throw new UserNotInPendingStatusException();
    }

    if (user.otp_verified) {
      throw new OtpAlreadyVerifiedException();
    }

    const otpCode = this.otpService.generateOtp();
    const otpExpiresAt = this.otpService.getOtpExpirationTime();

    await this.usersService.update(user.id, {
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt
    });

    const emailSent = await this.sendOtpVerificationEmail(user, otpCode);

    this.logger.log(`OTP resent for ${email} - ${emailSent ? 'email sent successfully' : 'email sending failed'}`)

    return {
      message: emailSent
        ? 'New OTP has been sent to your email.'
        : 'OTP has been generated but could not be sent via email. Please contact support.',
      otp_sent: emailSent
    };
  }

  async refreshToken(user: any) {
    return this.generateTokens(user)
  }

  private generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role || 'member'
    }

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '1d' })
    }
  }

  private async sendOtpVerificationEmail(user: any, otpCode: string): Promise<boolean> {
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
      };

      await this.emailHelperService.sendEmail(emailData);

      this.logger.log(`OTP verification email sent successfully to ${user.email}`)
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${user.email}:`, error);
      this.logger.warn(`OTP email delivery failed for ${user.email} - user can request resend`)

      return false;
    }
  }

  private async sendRegistrationNotifications(user: any, status: UserStatus): Promise<void> {
    try {
      const emailData: EmailData = {
        template: NotificationTemplate.REGISTRATION_CONFIRMATION,
        recipient: user.email,
        data: {
          fullname: user.fullname,
          email: user.email,
          username: user.username,
          status: status,
          depositInstructions: this.getDepositInstructions()
        },
        priority: 'high'
      };

      await this.emailHelperService.sendEmail(emailData);

      this.logger.log(`Registration confirmation email sent successfully to ${user.email}`)

      if (status === UserStatus.PENDING) {
        await this.notifyAdministrators(user);
      }
    } catch (error) {
      this.logger.error(`Failed to send registration confirmation email to ${user.email}:`, error)
    }
  }

  private async notifyAdministrators(user: any): Promise<void> {
    try {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@lumbungmesari.com'];

      const adminNotifications: EmailData[] = adminEmails.map(adminEmail => ({
        template: NotificationTemplate.ADMIN_NEW_REGISTRATION,
        recipient: adminEmail.trim(),
        data: {
          fullname: user.fullname,
          email: user.email,
          username: user.username,
          phone_number: user.phone_number,
          address: user.address,
          created_at: new Date().toLocaleDateString('id-ID'),
          deposit_image_url: user.deposit_image_url
        },
        priority: 'high'
      }));

      await this.emailHelperService.sendBulkEmail(adminNotifications);

      this.logger.log(`Admin notifications sent successfully to ${adminEmails.length} administrators for new user: ${user.email}`)
    } catch (error) {
      this.logger.error(`Failed to send admin notifications for new user ${user.email}:`, error)
    }
  }

  private getDepositInstructions(): any {
    return {
      amount: 50000,
      bank_details: {
        bank_name: 'Bank BRI',
        account_number: '1234567890',
        account_name: 'Koperasi Lumbung Mesari'
      },
      cooperative_address: 'Jl. Merdeka No. 123, Jakarta Pusat, DKI Jakarta',
      instructions: 'Silakan lakukan transfer sesuai nominal di atas dan upload bukti transfer melalui sistem.'
    };
  }
}

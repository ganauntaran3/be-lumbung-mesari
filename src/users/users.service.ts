import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'

import { Knex } from 'knex'

import { UserStatus } from '../common/constants'
import { DatabaseService } from '../database/database.service'
import { PaginationQueryDto } from '../database/dto/pagination.dto'
import {
  EmailData,
  EmailHelperService,
  NotificationTemplate
} from '../notifications/email/email-helper.service'
import { UsersSavingsService } from '../users-savings/users-savings.service'

import {
  ApprovalAction,
  ApprovalResponseDto,
  ApproveUserDto,
  RejectUserQueryDto
} from './dto/approve-user.dto'
import { EmailNotificationFailedException } from './exceptions/user.exceptions'
import {
  CreatedUser,
  UpdateUserDto,
  UpdateUserEntity,
  UserDbFormat,
  UserResponse,
  UserResponseFormat,
  UsersPaginatedResponse
} from './interface/users'
import { UsersRepository } from './users.repository'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailHelperService: EmailHelperService,
    private readonly usersSavingsService: UsersSavingsService,
    private readonly databaseService: DatabaseService
  ) {}

  private transformUserToResponse(user: UserDbFormat): UserResponseFormat {
    const {
      phone_number,
      role_id,
      otp_verified,
      created_at,
      updated_at,
      otp_code,
      otp_expires_at,
      ...otherData
    } = user
    return {
      ...otherData,
      phoneNumber: phone_number,
      roleId: role_id,
      otpVerified: otp_verified,
      otpCode: otp_code,
      otpExpiresAt: otp_expires_at,
      createdAt: created_at,
      updatedAt: updated_at
    }
  }

  private transformUserToDb(user: UpdateUserDto): UpdateUserEntity {
    const {
      phoneNumber,
      roleId,
      otpCode,
      otpVerified,
      otpExpiresAt,
      ...otherData
    } = user
    return {
      ...otherData,
      phone_number: phoneNumber,
      role_id: roleId,
      otp_code: otpCode,
      otp_verified: otpVerified,
      otp_expires_at: otpExpiresAt
    }
  }

  private async validateUserUniqueness(
    email: string,
    username: string
  ): Promise<void> {
    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
      this.findByEmail(email),
      this.findByUsername(username)
    ])

    if (existingUserByEmail) {
      throw new ConflictException('Email already exists')
    }

    if (existingUserByUsername) {
      throw new ConflictException('Username already exists')
    }
  }

  async findByEmail(email: string) {
    return await this.usersRepository.findByEmail(email)
  }

  async findByEmailWithRole(email: string) {
    return await this.usersRepository.findByEmailWithRole(email)
  }

  async findByIdentifierWithRole(identifier: string) {
    return await this.usersRepository.findByIdentifierWithRole(identifier)
  }

  async findByUsername(username: string) {
    return await this.usersRepository.findByUsername(username)
  }

  async findByIdIncludeOtp(id: string) {
    try {
      const user = await this.usersRepository.findById(id)

      if (!user) {
        this.logger.error(`User not found for ID: ${id}`)
        throw new NotFoundException('User not found')
      }

      const { password, deposit_image_url, ...safeUserData } = user

      return safeUserData
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error
      }

      this.logger.error('Unexpected profile retrieval error:', error)
      throw new InternalServerErrorException({
        statusCode: 500,
        message: error.message,
        error: 'Internal Server Error'
      })
    }
  }

  async findById(id: string) {
    try {
      const user = await this.usersRepository.findById(id)

      if (!user) {
        this.logger.error(`User not found for ID: ${id}`)
        throw new NotFoundException('User not found')
      }

      const {
        password,
        otp_code,
        otp_expires_at,
        deposit_image_url,
        ...safeUserData
      } = user

      return this.transformUserToResponse(safeUserData)
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error
      }

      this.logger.error('Unexpected profile retrieval error:', error)
      throw new InternalServerErrorException({
        statusCode: 500,
        message: error.message,
        error: 'Internal Server Error'
      })
    }
  }

  async create(user: CreatedUser) {
    try {
      await this.validateUserUniqueness(user.email, user.username)
      const userDb = this.transformUserToDb(user)
      return await this.usersRepository.create(userDb)
    } catch (error: any) {
      this.logger.error(`Error creating user: ${error}`)
      throw error
    }
  }

  async findAllWithPagination(
    options: PaginationQueryDto & {
      role?: string
      status?: string
      search?: string
    } = {}
  ): Promise<UsersPaginatedResponse> {
    const result = await this.usersRepository.findAllWithRoles(options)

    return {
      ...result,
      data: result.data.map(
        (user) => this.transformUserToResponse(user) as UserResponse
      )
    }
  }

  async update(id: string, userData: UpdateUserDto, trx?: Knex.Transaction) {
    const existingUser = await this.usersRepository.findById(id)
    if (!existingUser) {
      throw new NotFoundException('User not found')
    }

    const userDb = this.transformUserToDb(userData)
    return await this.usersRepository.updateUser(id, userDb, trx)
  }

  async approveUser(
    userId: string,
    approvalData: ApproveUserDto,
    adminId: string
  ): Promise<ApprovalResponseDto> {
    const user = await this.findById(userId)

    if (user.status !== UserStatus.WAITING_DEPOSIT) {
      throw new BadRequestException(
        `Cannot approve user with status: ${user.status}`
      )
    }

    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      this.logger.log(`Starting user approval transaction for user ${userId}`)

      // 1. Update user status to active
      await this.usersRepository.updateStatus(userId, UserStatus.ACTIVE, trx)

      // 2. Approve principal savings (mark as paid, create income, create cashbook transaction)
      await this.usersSavingsService.settlePrincipalSavings(
        userId,
        adminId,
        trx
      )
      await trx.commit()
      this.logger.log(
        `Transaction committed successfully for user ${userId} approval`
      )

      try {
        await this.sendApprovalEmail(
          user,
          ApprovalAction.APPROVE,
          approvalData.reason
        )
      } catch (emailError) {
        // Handle email notification failure
        if (emailError instanceof EmailNotificationFailedException) {
          this.logger.error(
            `User ${userId} approved successfully but email notification failed`
          )
          throw emailError
        }
        this.logger.error(
          `Unexpected error sending approval email:`,
          emailError
        )
      }

      const reasonText = approvalData.reason
        ? ` - Reason: ${approvalData.reason}`
        : ''
      this.logger.log(`User ${userId} approved, reason: ${reasonText}`)

      return {
        message: 'User approved successfully!',
        status: UserStatus.ACTIVE,
        userId: userId
      }
    } catch (error) {
      // Only rollback if transaction hasn't been committed
      if (!trx.isCompleted()) {
        await trx.rollback()
        this.logger.error(`Transaction rolled back for user ${userId}`)
      }
      throw error
    }
  }

  async rejectUser(
    userId: string,
    rejectionData: RejectUserQueryDto,
    adminId: string
  ): Promise<ApprovalResponseDto> {
    const user = await this.findById(userId)

    if (user.status !== UserStatus.WAITING_DEPOSIT) {
      throw new BadRequestException(
        `Cannot reject user with status: ${user.status}`
      )
    }

    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      this.logger.log(`Starting user rejection transaction for user ${userId}`)

      await this.usersRepository.updateStatus(userId, UserStatus.REJECTED, trx)

      await trx.commit()
      this.logger.log(
        `Transaction committed successfully for user ${userId} rejection`
      )

      // Send rejection email (outside transaction)
      try {
        await this.sendApprovalEmail(
          user,
          ApprovalAction.REJECT,
          rejectionData.reason
        )
      } catch (emailError) {
        if (emailError instanceof EmailNotificationFailedException) {
          this.logger.warn(
            `User ${userId} rejected successfully but email notification failed`
          )
          throw emailError
        }
        this.logger.error(
          `Unexpected error sending rejection email:`,
          emailError
        )
      }

      const reasonText = rejectionData.reason
        ? ` - Reason: ${rejectionData.reason}`
        : ''
      this.logger.log(
        `User ${userId} rejected by admin ${adminId}${reasonText}`
      )

      return {
        message: 'User rejected successfully',
        status: UserStatus.WAITING_DEPOSIT,
        userId: userId
      }
    } catch (error) {
      if (!trx.isCompleted()) {
        await trx.rollback()
        this.logger.error(`Transaction rolled back for user ${userId}`)
      }
      throw error
    }
  }

  private async sendApprovalEmail(
    user: any,
    action: ApprovalAction,
    reason?: string
  ): Promise<void> {
    try {
      const template =
        action === ApprovalAction.APPROVE
          ? NotificationTemplate.REGISTRATION_APPROVED
          : NotificationTemplate.REGISTRATION_REJECTED

      const emailData: EmailData = {
        template,
        recipient: user.email,
        data: {
          fullname: user.fullname,
          email: user.email,
          username: user.username,
          ...(reason && { reason })
        },
        priority: 'high'
      }

      await this.emailHelperService.sendEmail(emailData)

      this.logger.log(`${action} email sent successfully to ${user.email}`)
    } catch (error) {
      this.logger.error(
        `Failed to send ${action} email to ${user.email}:`,
        error
      )
      throw new EmailNotificationFailedException(user.email, action, error)
    }
  }
}

import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common'
import { CreatedUser, UpdateUserDto, UpdateUserEntity, User, UsersPaginatedResponse } from './interface/users'
import { UsersRepository } from './users.repository'
import { ApproveUserDto, ApprovalAction, ApprovalResponseDto } from './dto/approve-user.dto'
import { EmailHelperService, NotificationTemplate, EmailData } from '../notifications/email/email-helper.service'
import { UsersSavingsService } from '../users-savings/users-savings.service'
import { Knex } from 'knex'
import { PaginationQueryDto } from 'src/database/dto/pagination.dto'
import { DatabaseService } from 'src/database/database.service'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailHelperService: EmailHelperService,
    private readonly usersSavingsService: UsersSavingsService,
    private readonly databaseService: DatabaseService
  ) { }

  private transformUserToResponse(user: any): any {
    const { phone_number, role_id, deposit_image_url, otp_verified, created_at, updated_at, ...otherData } = user
    return {
      ...otherData,
      phoneNumber: phone_number,
      roleId: role_id,
      depositImageUrl: deposit_image_url,
      otpVerified: otp_verified,
      createdAt: created_at,
      updatedAt: updated_at
    }
  }

  private transformUserToDb(user: UpdateUserDto): UpdateUserEntity {
    const { phoneNumber, roleId, otpCode, otpVerified, otpExpiresAt, ...otherData } = user
    return {
      ...otherData,
      phone_number: phoneNumber,
      role_id: roleId,
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt,
    }
  }

  private async validateUserUniqueness(email: string, username: string): Promise<void> {
    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
      this.findByEmail(email),
      this.findByUsername(username)
    ]);

    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
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
        this.logger.error(`User not found for ID: ${id}`);
        throw new NotFoundException({
          message: 'User not found',
        });
      }

      const { password, deposit_image_url, ...safeUserData } = user;

      return this.transformUserToResponse(safeUserData);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Unexpected profile retrieval error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: error.message,
        error: 'Internal Server Error'
      });
    }
  }

  async findById(id: string) {
    try {
      const user = await this.usersRepository.findById(id)

      if (!user) {
        this.logger.error(`User not found for ID: ${id}`);
        throw new NotFoundException({
          message: 'User not found',
        });
      }

      const { password, otp_code, otp_expires_at, deposit_image_url, ...safeUserData } = user;

      return this.transformUserToResponse(safeUserData);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Unexpected profile retrieval error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: error.message,
        error: 'Internal Server Error'
      });
    }
  }

  async create(user: CreatedUser) {
    try {
      await this.validateUserUniqueness(user.email, user.username);
      const userDb = this.transformUserToDb(user)
      return await this.usersRepository.create(userDb)
    } catch (error: any) {
      this.logger.error(`Error creating user: ${error}`);
      throw error
    }
  }

  async findAllWithPagination(
    options: PaginationQueryDto & { role?: string; status?: string; search?: string } = {}
  ): Promise<UsersPaginatedResponse> {
    const result = await this.usersRepository.findAllWithRoles(options)

    return {
      ...result,
      data: result.data.map((user) => this.transformUserToResponse(user))
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
    adminId: string,
  ): Promise<ApprovalResponseDto> {
    const user = await this.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.status !== 'pending') {
      throw new BadRequestException(`Cannot ${approvalData.action} user with status: ${user.status}`)
    }

    const oldStatus = user.status
    let newStatus: string
    let message: string

    const knex = this.databaseService.getKnex()
    const trx = await knex.transaction()

    try {
      if (approvalData.action === ApprovalAction.APPROVE) {
        newStatus = 'active'
        message = 'User approved successfully'

        this.logger.log(`Starting user approval transaction for user ${userId}`)

        // 1. Update user status to active
        await this.usersRepository.updateStatus(userId, newStatus, trx)
        this.logger.debug(`User status updated to ${newStatus} for user ${userId}`)

        // 2. Approve principal savings (mark as paid, create income, create cashbook transaction)
        await this.usersSavingsService.approvePrincipalSavingsForUser(userId, adminId, trx)
        this.logger.debug(`Principal savings approved for user ${userId}`)

        // Commit transaction before sending email
        await trx.commit()
        this.logger.log(`Transaction committed successfully for user ${userId} approval`)

        // 3. Send approval email (outside transaction)
        try {
          await this.sendApprovalEmail(user, approvalData.action, approvalData.reason)
        } catch (emailError) {
          // Log email error but don't fail the approval since transaction is already committed
          this.logger.error(`Failed to send approval email to ${user.email}:`, emailError)
          this.logger.warn(`User ${userId} approved successfully but email notification failed`)
        }

        this.logger.log(`User ${userId} approved by admin ${adminId}`)
      } else {
        newStatus = 'waiting_deposit'
        message = 'User rejected successfully'

        this.logger.log(`Starting user rejection transaction for user ${userId}`)

        // Update user status to waiting_deposit
        await this.usersRepository.updateStatus(userId, newStatus, trx)
        this.logger.debug(`User status updated to ${newStatus} for user ${userId}`)

        // Commit transaction before sending email
        await trx.commit()
        this.logger.log(`Transaction committed successfully for user ${userId} rejection`)

        // Send rejection email (outside transaction)
        try {
          await this.sendApprovalEmail(user, approvalData.action, approvalData.reason)
        } catch (emailError) {
          // Log email error but don't fail the rejection since transaction is already committed
          this.logger.error(`Failed to send rejection email to ${user.email}:`, emailError)
          this.logger.warn(`User ${userId} rejected successfully but email notification failed`)
        }

        this.logger.log(`User ${userId} rejected by admin ${adminId}. Reason: ${approvalData.reason}`)
      }

      const reasonText = approvalData.reason ? ` - Reason: ${approvalData.reason}` : ''
      this.logger.log(`User ${userId} status changed from ${oldStatus} to ${newStatus} by admin ${adminId}${reasonText}`)

      return {
        message,
        status: newStatus,
        userId: userId
      }

    } catch (error) {
      // Rollback transaction on any error
      try {
        await trx.rollback()
        this.logger.log(`Transaction rolled back for user ${userId} ${approvalData.action}`)
      } catch (rollbackError) {
        this.logger.error(`Failed to rollback transaction for user ${userId}:`, rollbackError)
      }

      this.logger.error(`Failed to ${approvalData.action} user ${userId}:`, error)
      throw new BadRequestException(`Failed to ${approvalData.action} user: ${error}`)
    }
  }

  private async sendApprovalEmail(
    user: any,
    action: ApprovalAction,
    reason?: string
  ): Promise<void> {
    try {
      const template = action === ApprovalAction.APPROVE
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
      this.logger.error(`Failed to send ${action} email to ${user.email}:`, error)
      this.logger.warn(`Failed to send ${action} notification email to ${user.email} - approval still processed successfully`)
    }
  }
}

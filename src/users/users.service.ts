import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { NewUser } from '../interface/users'
import { UsersRepository } from './users.repository'
import { PaginationOptions } from '../interface/pagination'
import { UsersPaginatedResponse } from '../interface/users'
import { ApproveUserDto, ApprovalAction, ApprovalResponseDto } from './dto/approve-user.dto'
import { EmailHelperService, NotificationTemplate, EmailData } from '../notifications/email/email-helper.service'
import { UsersSavingsService } from '../users-savings/users-savings.service'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    private usersRepository: UsersRepository,
    private emailHelperService: EmailHelperService,
    private usersSavingsService: UsersSavingsService
  ) { }

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

  async findById(id: string) {
    return await this.usersRepository.findById(id)
  }

  async create(userData: NewUser) {
    const existingUser = await this.findByEmail(userData.email)
    if (existingUser) {
      throw new ConflictException('Email already exists')
    }

    return await this.usersRepository.create(userData)
  }

  async findAll() {
    const users = await this.usersRepository.findAll()
    return users
  }

  async findAllWithPagination(
    options: PaginationOptions & { role?: string; status?: string; search?: string } = {}
  ): Promise<UsersPaginatedResponse> {
    const result = await this.usersRepository.findAllWithRoles(options)

    return {
      ...result as UsersPaginatedResponse
    }
  }

  async findPendingUsers(options: PaginationOptions = {}): Promise<UsersPaginatedResponse> {
    const result = await this.usersRepository.findPendingUsers(options)
    return {
      ...result as UsersPaginatedResponse
    }
  }

  async update(id: string, userData: Partial<NewUser>) {
    return await this.usersRepository.updateUser(id, userData)
  }

  async updateWithTransaction(id: string, userData: Partial<NewUser>, trx: any) {
    return await this.usersRepository.updateUserWithTransaction(id, userData, trx)
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

    try {
      if (approvalData.action === ApprovalAction.APPROVE) {
        newStatus = 'active'
        message = 'User approved successfully'

        await this.usersRepository.updateStatus(userId, newStatus)

        // Approve principal savings (mark as paid, create income, create cashbook transaction)
        try {
          await this.usersSavingsService.approvePrincipalSavingsForUser(userId, adminId)
          this.logger.log(`Principal savings approved and income/cashbook transaction created for user ${userId}`)
        } catch (error) {
          this.logger.error(`Failed to approve principal savings for user ${userId}:`, error)
          // Don't block user approval if principal savings approval fails
          this.logger.warn(`User ${userId} approved but principal savings approval failed`)
        }

        await this.sendApprovalEmail(user, approvalData.action, approvalData.reason)

        this.logger.log(`User ${userId} approved by admin ${adminId}`)
      } else {
        newStatus = 'waiting_deposit'
        message = 'User rejected successfully'

        await this.usersRepository.updateStatus(userId, newStatus)
        await this.sendApprovalEmail(user, approvalData.action, approvalData.reason)

        this.logger.log(`User ${userId} rejected by admin ${adminId}. Reason: ${approvalData.reason}`)
      }

      this.logger.log(`User ${userId} status changed from ${oldStatus} to ${newStatus} by admin ${adminId}${approvalData.reason ? ` - Reason: ${approvalData.reason}` : ''}`)

      return {
        message,
        status: newStatus,
        userId: userId
      }

    } catch (error) {
      this.logger.error(`Failed to ${approvalData.action} user ${userId}:`, error)
      throw new BadRequestException(`Failed to ${approvalData.action} user`)
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

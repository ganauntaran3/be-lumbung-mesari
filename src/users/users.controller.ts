import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserProfileResponseSchema } from '../auth/dto/profile-response.dto'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserRole } from '../common/constants'
import {
  AuthErrorSchemas,
  TokenErrorSchemas
} from '../common/schema/error-schema'

import {
  ApprovalResponseDto,
  ApproveUserDto,
  RejectUserQueryDto
} from './dto/approve-user.dto'
import { UsersQueryDto } from './dto/users-query.dto'
import { UsersPaginatedResponseDto } from './dto/users-response.dto'
import { EmailNotificationFailedException } from './exceptions/user.exceptions'
import { UserJWT } from './interface/users'
import { UsersService } from './users.service'

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name)

  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Retrieve the authenticated user's profile information. Accessible by all authenticated users."
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
    schema: UserProfileResponseSchema
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: TokenErrorSchemas.invalidToken
  })
  async getProfile(@CurrentUser() user: UserJWT) {
    const fullUser = await this.usersService.findById(user.id)
    return fullUser
  }

  @Get('me/loans')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current user loans',
    description:
      'Retrieve all loans for the authenticated user with pagination support. Users can only see their own loans.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Loans retrieved successfully'
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: TokenErrorSchemas.invalidToken
  })
  async getMyLoans(@CurrentUser() user: UserJWT, @Query() queryParams: any) {
    const result = await this.usersService.findUserLoans(user.id, queryParams)
    return result
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get users with filtering and pagination',
    description:
      'Retrieve all users with optional filtering by status, role(s), and search. Supports multiple role filtering using comma-separated values (e.g., role=administrator,superadministrator for admin management). Use status=pending to get pending users.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: UsersPaginatedResponseDto
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: TokenErrorSchemas.invalidToken
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    schema: AuthErrorSchemas.insufficientPermissions
  })
  async findAll(@Query() queryParams: UsersQueryDto) {
    const result = await this.usersService.findAllWithPagination(queryParams)
    return result
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Approve a user registration',
    description:
      'Approve a pending user registration. This will activate the user account and process their principal savings. Note: If email notification fails, the approval will still succeed but a warning will be included in the response.'
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User approved successfully',
    type: ApprovalResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid action or user status',
    example: {
      message: 'Cannot approve user with status: active',
      statusCode: 400,
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: TokenErrorSchemas.invalidToken
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    schema: AuthErrorSchemas.insufficientPermissions
  })
  @ApiNotFoundResponse({
    description: 'Not Found - User not found'
  })
  async approveUser(
    @Param('id') userId: string,
    @Body() approvalData: ApproveUserDto,
    @CurrentUser() admin: any
  ): Promise<ApprovalResponseDto> {
    try {
      return await this.usersService.approveUser(userId, approvalData, admin.id)
    } catch (error) {
      if (error instanceof EmailNotificationFailedException) {
        this.logger.warn(
          `User ${userId} approved but email notification failed: ${error.message}`
        )

        return {
          message: 'User approved successfully, but email notification failed',
          status: 'active',
          userId: userId,
          warning: 'Email notification could not be sent'
        }
      }
      throw error
    }
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Reject a user registration',
    description:
      'Reject a pending user registration. The user status will be changed to waiting_deposit. A reason must be provided. Note: If email notification fails, the rejection will still succeed but a warning will be included in the response.'
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User rejected successfully',
    type: ApprovalResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request - Invalid action or user status'
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async rejectUser(
    @Param('id') userId: string,
    @Body() rejectionData: RejectUserQueryDto,
    @CurrentUser() admin: any
  ): Promise<ApprovalResponseDto> {
    try {
      return await this.usersService.rejectUser(userId, rejectionData, admin.id)
    } catch (error) {
      if (error instanceof EmailNotificationFailedException) {
        this.logger.warn(
          `User ${userId} rejected but email notification failed: ${error.message}`
        )
        // Return success response with warning
        return {
          message: 'User rejected successfully, but email notification failed',
          status: 'waiting_deposit',
          userId: userId,
          warning: 'Email notification could not be sent'
        }
      }
      // Re-throw other errors
      throw error
    }
  }
}

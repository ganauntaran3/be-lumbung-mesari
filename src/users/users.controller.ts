import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Param,
  Body,
  Logger,
  HttpStatus,
  HttpCode
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiUnauthorizedResponse
} from '@nestjs/swagger'
import { UserProfileResponseSchema } from 'src/auth/dto/profile-response.dto'
import { UserRole } from 'src/common/constants'
import { TokenErrorSchemas } from 'src/common/schema/error-schema'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'

import { ApproveUserDto, ApprovalResponseDto } from './dto/approve-user.dto'
import { UsersQueryDto } from './dto/users-query.dto'
import { UsersPaginatedResponseDto } from './dto/users-response.dto'
import { EmailNotificationFailedException } from './exceptions/user.exceptions'
import { UserJWT } from './interface/users'
import { UsersService } from './users.service'

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name)

  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
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
    description: 'Unauthorized - Invalid token',
    schema: TokenErrorSchemas.invalidToken
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Expired token',
    schema: TokenErrorSchemas.expiredToken
  })
  async getProfile(@CurrentUser() user: UserJWT) {
    const fullUser = await this.usersService.findById(user.id)
    return fullUser
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get users with filtering and pagination',
    description:
      'Retrieve all users with optional filtering by status, role, and search. Use status=pending to get pending users.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: UsersPaginatedResponseDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions'
  })
  async findAll(@Query() queryParams: UsersQueryDto) {
    const result = await this.usersService.findAllWithPagination(queryParams)
    return result
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Approve or reject a user registration',
    description:
      'Approve or reject a pending user registration. Reason is optional for both actions. Note: If email notification fails, the approval will still succeed but a warning will be included in the response.'
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User approval/rejection processed successfully',
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
        // Return success response with warning
        return {
          message: 'User approved successfully, but email notification failed',
          status: 'active',
          userId: userId,
          warning: 'Email notification could not be sent'
        }
      }
      // Re-throw other errors
      throw error
    }
  }
}

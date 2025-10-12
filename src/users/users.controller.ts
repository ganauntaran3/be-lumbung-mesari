import { Controller, Get, Query, UseGuards, Post, Param, Body, Req, InternalServerErrorException, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiUnauthorizedResponse } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../auth/enums/role.enum'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UsersQueryDto } from './dto/users-query.dto'
import { ApproveUserDto, ApprovalResponseDto } from './dto/approve-user.dto'
import { Request } from 'express'
import { UserProfileResponseSchema } from 'src/auth/dto/profile-response.dto'
import { TokenErrorSchemas } from 'src/common/schema/error-schema'

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name)

  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current user profile',
    description: "Retrieve the authenticated user's profile information. Accessible by all authenticated users."
  })
  @ApiResponse({
    status: 200,
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
  async getProfile(@CurrentUser() user: any) {
    try {
      // Extract user ID from token and fetch full user data from database
      const fullUser = await this.usersService.findById(user.id);

      if (!fullUser) {
        this.logger.error(`User not found for ID: ${user.id}`);
        throw new InternalServerErrorException({
          statusCode: 500,
          message: 'User not found',
          error: 'Internal Server Error'
        });
      }

      // Remove sensitive fields
      const { password, otp_code, otp_expires_at, ...safeUserData } = fullUser;

      return safeUserData;
    } catch (error) {
      this.logger.error('Unexpected profile retrieval error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred while retrieving profile',
        error: 'Internal Server Error'
      });
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get users with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              fullname: { type: 'string' },
              username: { type: 'string' },
              phone_number: { type: 'string' },
              address: { type: 'string' },
              status: {
                type: 'string',
                enum: ['waiting_deposit', 'active', 'inactive', 'suspended']
              }
            }
          }
        },
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        totalData: { type: 'integer', example: 50 },
        totalPage: { type: 'integer', example: 5 },
        next: { type: 'boolean', example: true },
        prev: { type: 'boolean', example: false }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions'
  })
  async findAll(
    @Query() queryParams: UsersQueryDto
  ) {
    return await this.usersService.findAllWithPagination(queryParams)
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get pending users awaiting approval' })
  @ApiResponse({
    status: 200,
    description: 'Pending users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              fullname: { type: 'string' },
              username: { type: 'string' },
              phone_number: { type: 'string' },
              address: { type: 'string' },
              status: { type: 'string', enum: ['pending'] },
              deposit_image_url: { type: 'string', nullable: true }
            }
          }
        },
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        totalData: { type: 'integer', example: 5 },
        totalPage: { type: 'integer', example: 1 },
        next: { type: 'boolean', example: false },
        prev: { type: 'boolean', example: false }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findPendingUsers(@Query() queryParams: UsersQueryDto) {
    return await this.usersService.findPendingUsers(queryParams)
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Approve or reject a user registration',
    description: 'Approve or reject a pending user registration. Reason is optional for both actions.'
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: 'User approval/rejection processed successfully',
    type: ApprovalResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid action or user status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async approveUser(
    @Param('id') userId: string,
    @Body() approvalData: ApproveUserDto,
    @CurrentUser() admin: any,
    @Req() request: Request
  ): Promise<ApprovalResponseDto> {
    const ipAddress = request.ip || request.connection.remoteAddress
    const userAgent = request.get('User-Agent')

    return await this.usersService.approveUser(
      userId,
      approvalData,
      admin.id,
      ipAddress,
      userAgent
    )
  }
}

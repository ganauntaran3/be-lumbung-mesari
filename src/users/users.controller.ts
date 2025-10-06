import { Controller, Get, Query, UseGuards, Post, Param, Body, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../auth/enums/role.enum'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UsersQueryDto } from './dto/users-query.dto'
import { ApproveUserDto, ApprovalResponseDto } from './dto/approve-user.dto'
import { Request } from 'express'

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: any) {
    return user
  }

  @Get()
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

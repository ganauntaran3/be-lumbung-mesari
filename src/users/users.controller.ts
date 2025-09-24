import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../auth/enums/role.enum'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard) // Override class-level guards for this endpoint
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: any) {
    return user
  }

  @Get()
  @ApiOperation({ summary: 'Get users with filtering and pagination' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by user role',
    enum: ['member', 'administrator', 'superadministrator']
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    type: Number,
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    type: Number,
    example: 10
  })
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
    @Query('role') role?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10
  ) {
    // Validate limit range
    const validLimit = Math.min(Math.max(limit, 1), 100)
    const validPage = Math.max(page, 1)

    // Debug logging
    console.log('UsersController Debug:', {
      original_params: { role, page, limit },
      validated_params: { role, page: validPage, limit: validLimit }
    })

    const result = await this.usersService.findAllWithPagination(
      validPage,
      validLimit,
      role
    )

    // Transform data to match API specification (remove sensitive fields)
    const transformedData = result.data.map((user) => ({
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      username: user.username,
      phone_number: user.phone_number,
      address: user.address,
      status: user.status
    }))

    return {
      data: transformedData,
      page: result.page,
      limit: result.limit,
      next: result.next,
      prev: result.prev
    }
  }
}

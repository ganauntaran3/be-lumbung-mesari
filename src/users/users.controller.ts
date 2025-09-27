import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../auth/enums/role.enum'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UsersQueryDto } from './dto/users-query.dto'

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

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
}

import { Controller, Get, Post, Query, UseGuards, Param, Logger, ForbiddenException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiBadRequestResponse } from '@nestjs/swagger'
import { SavingsService } from './savings.service'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole } from '../auth/enums/role.enum'
import { SavingsQueryDto } from './dto/savings-query.dto'
import {
    createUnauthorizedSchema,
    createBadRequestSchema,
    createForbiddenSchema,
    createNotFoundSchema
} from '../common/schema/error-schema'
import { MandatorySavingsPaginatedResponseDto } from './dto/savings-response.dto'

@ApiTags('Savings')
@Controller('savings')
@UseGuards(JwtAuthGuard)
export class SavingsController {
    private readonly logger = new Logger(SavingsController.name)

    constructor(private readonly savingsService: SavingsService) { }

    /**
     * Transform savings record from snake_case (database) to camelCase (API)
     */
    private transformSavingsRecord(record: any): any {
        const { period_date, paid_at, created_at, updated_at, processed_by_user, ...otherData } = record
        return {
            ...otherData,
            periodDate: period_date,
            paidAt: paid_at,
            createdAt: created_at,
            updatedAt: updated_at,
            processedByUser: processed_by_user
        }
    }

    @Get('all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({
        summary: 'Get all mandatory savings records with filtering and pagination',
        description: `Retrieve all mandatory savings records across all members. Only accessible by administrators and superadministrators.
        
        **Filtering Options:**
        - \`period=october\` - Get current year's October records
        - \`period=october&year=2025\` - Get October 2025 records
        - No parameters - Get last 30 days of records`
    })
    @ApiResponse({
        status: 200,
        description: 'Mandatory savings retrieved successfully',
        type: MandatorySavingsPaginatedResponseDto
    })
    @ApiBadRequestResponse({
        description: 'Bad Request - Invalid query parameters',
        schema: createBadRequestSchema('Invalid query parameters provided')
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized - Invalid or missing token',
        schema: createUnauthorizedSchema('Authentication required')
    })
    @ApiForbiddenResponse({
        description: 'Forbidden - Insufficient permissions',
        schema: createForbiddenSchema('Insufficient permissions to access this resource')
    })
    async findAllMandatorySavings(
        @Query() queryParams: SavingsQueryDto
    ) {
        try {
            this.logger.log('Fetching all mandatory savings records')
            const result = await this.savingsService.findAllMandatorySavings(queryParams)

            // Log successful retrieval for audit purposes
            this.logger.log(`Successfully retrieved ${result.data.length} mandatory savings records`)

            // Transform data to camelCase
            const transformedData = result.data.map(record => this.transformSavingsRecord(record))

            return {
                ...result,
                data: transformedData
            }
        } catch (error) {
            this.logger.error('Error fetching all mandatory savings:', error)

            // Handle specific error types
            if (error instanceof BadRequestException) {
                throw error
            }

            if (error instanceof InternalServerErrorException) {
                throw error
            }

            // Handle unexpected errors
            this.logger.error('Unexpected error in findAllMandatorySavings:', error)
            throw new InternalServerErrorException({
                statusCode: 500,
                message: 'An unexpected error occurred while retrieving mandatory savings',
                error: 'Internal Server Error'
            })
        }
    }

    @Get(':userId')
    @ApiOperation({
        summary: 'Get mandatory savings records for a specific user',
        description: 'Retrieve mandatory savings records for a specific user. Members can only access their own records, while administrators can access any user records.'
    })
    @ApiParam({
        name: 'userId',
        description: 'User ID',
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @ApiResponse({
        status: 200,
        description: 'User mandatory savings retrieved successfully',
        type: MandatorySavingsPaginatedResponseDto
    })
    @ApiBadRequestResponse({
        description: 'Bad Request - Invalid query parameters',
        schema: createBadRequestSchema('Invalid query parameters provided')
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized - Invalid or missing token',
        schema: createUnauthorizedSchema('Authentication required')
    })
    @ApiForbiddenResponse({
        description: 'Forbidden - Insufficient permissions',
        schema: createForbiddenSchema('You can only access your own savings records')
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
        schema: createNotFoundSchema('User not found')
    })
    async findUserMandatorySavings(
        @Param('userId') userId: string,
        @Query() queryParams: SavingsQueryDto,
        @CurrentUser() currentUser: any
    ) {
        try {
            if (!userId || userId.trim() === '') {
                this.logger.warn('Invalid userId provided: empty or null')
                throw new BadRequestException({
                    statusCode: 400,
                    message: 'User ID is required',
                    error: 'Bad Request'
                })
            }

            this.logger.log(`Fetching mandatory savings for user: ${userId}`)

            // Check if user is trying to access their own records or is an admin
            const isAdmin = currentUser.role_id === UserRole.ADMIN || currentUser.role_id === UserRole.SUPERADMIN
            const isOwnRecord = currentUser.id === userId

            if (!isAdmin && !isOwnRecord) {
                this.logger.warn(`User ${currentUser.id} (role: ${currentUser.role_id}) attempted to access savings for user ${userId}`)
                throw new ForbiddenException({
                    statusCode: 403,
                    message: 'You can only access your own savings records',
                    error: 'Forbidden'
                })
            }

            const result = await this.savingsService.findUserMandatorySavings(userId, queryParams)

            if (!result || result.data.length === 0) {
                this.logger.log(`No savings records found for user: ${userId}`)
            } else {
                this.logger.log(`Successfully retrieved ${result.data.length} mandatory savings records for user ${userId}`)
            }

            // Transform data to camelCase
            const transformedData = result.data.map(record => this.transformSavingsRecord(record))

            return {
                ...result,
                data: transformedData
            }
        } catch (error) {
            // Handle specific error types
            if (error instanceof ForbiddenException ||
                error instanceof NotFoundException ||
                error instanceof BadRequestException) {
                throw error
            }

            if (error instanceof InternalServerErrorException) {
                throw error
            }

            // Handle unexpected errors
            this.logger.error(`Unexpected error fetching mandatory savings for user ${userId}:`, error)
            throw new InternalServerErrorException({
                statusCode: 500,
                message: 'An unexpected error occurred while retrieving user mandatory savings',
                error: 'Internal Server Error'
            })
        }
    }

    @Post('generate-remaining-year')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({
        summary: '[DEV] Generate mandatory savings for remaining months of current year',
        description: 'Development endpoint to manually generate mandatory savings records from current month until end of year for all active members (excludes admin and superadmin). Example: If triggered in October, generates records for October, November, and December.'
    })
    @ApiResponse({
        status: 201,
        description: 'Mandatory savings generated successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Successfully generated mandatory savings for 3 months (October to December) for 10 active members' },
                monthsGenerated: { type: 'number', example: 3 },
                usersCount: { type: 'number', example: 10 },
                totalRecords: { type: 'number', example: 30 },
                months: { type: 'array', items: { type: 'string' }, example: ['October', 'November', 'December'] }
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized - Invalid or missing token',
        schema: createUnauthorizedSchema('Authentication required')
    })
    @ApiForbiddenResponse({
        description: 'Forbidden - Insufficient permissions',
        schema: createForbiddenSchema('Insufficient permissions to access this resource')
    })
    async generateRemainingYearSavings() {
        try {
            this.logger.log('Manual trigger: Generating mandatory savings for remaining months of current year')
            const result = await this.savingsService.generateRemainingYearSavings()

            this.logger.log(`Successfully generated ${result.total_records} records for ${result.months_generated} months`)

            // Transform response to camelCase
            return {
                message: result.message,
                monthsGenerated: result.months_generated,
                usersCount: result.users_count,
                totalRecords: result.total_records,
                months: result.months
            }
        } catch (error) {
            this.logger.error('Error generating remaining year savings:', error)

            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error
            }

            throw new InternalServerErrorException({
                statusCode: 500,
                message: 'An unexpected error occurred while generating mandatory savings',
                error: 'Internal Server Error'
            })
        }
    }
}
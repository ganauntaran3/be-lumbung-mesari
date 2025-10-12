import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SavingsRepository } from './savings.repository'
import { UsersService } from '../users/users.service'
import { SavingsQueryDto } from './dto/savings-query.dto'
import { MandatorySavingsPaginatedResponse } from './interfaces/mandatory-savings.interface'

@Injectable()
export class SavingsService {
    private readonly logger = new Logger(SavingsService.name)

    constructor(
        private readonly savingsRepository: SavingsRepository,
        private readonly usersService: UsersService,
        private readonly configService: ConfigService
    ) { }

    async findAllMandatorySavings(
        queryParams: SavingsQueryDto
    ): Promise<MandatorySavingsPaginatedResponse> {
        try {
            this.logger.log('Retrieving mandatory savings with parameters:', JSON.stringify(queryParams))

            if (queryParams.period) {
                this.validatePeriodParameter(queryParams.period)
            }

            // Apply default date range configuration if no period specified
            const processedParams = this.applyDefaultDateRange(queryParams)

            const result = await this.savingsRepository.findAllWithUsers(processedParams)

            this.logger.log(`Retrieved ${result.data.length} mandatory savings records out of ${result.totalData} total`)

            return result
        } catch (error) {
            this.logger.error('Failed to retrieve mandatory savings:', error)

            if (error instanceof BadRequestException) {
                throw error
            }

            throw new InternalServerErrorException('Failed to retrieve mandatory savings records')
        }
    }

    async findUserMandatorySavings(
        userId: string,
        queryParams: SavingsQueryDto
    ): Promise<MandatorySavingsPaginatedResponse> {
        try {
            this.logger.log(`Retrieving mandatory savings for user ${userId} with parameters:`, JSON.stringify(queryParams))

            // Validate period parameter if provided
            if (queryParams.period) {
                this.validatePeriodParameter(queryParams.period)
            }

            // Apply default date range configuration if no period specified
            const processedParams = this.applyDefaultDateRange(queryParams)

            const result = await this.savingsRepository.findByUserIdWithPagination(userId, processedParams)

            this.logger.log(`Retrieved ${result.data.length} mandatory savings records for user ${userId} out of ${result.totalData} total`)

            return result
        } catch (error) {
            this.logger.error(`Failed to retrieve mandatory savings for user ${userId}:`, error)

            if (error instanceof BadRequestException) {
                throw error
            }

            throw new InternalServerErrorException('Failed to retrieve user mandatory savings records')
        }
    }

    async createYearlyMandatorySavingsForAllUsers(): Promise<void> {
        this.logger.log('Starting yearly mandatory savings creation for all active members (12 months)')

        try {
            // Get all active users
            const allUsers = await this.usersService.findAll()

            // Filter for active members only (exclude admin and superadmin)
            const activeMembers = allUsers.filter(user =>
                user.status === 'active' && user.role_id === 'member'
            )

            this.logger.log(`Found ${activeMembers.length} active members out of ${allUsers.length} total users`)

            if (activeMembers.length === 0) {
                this.logger.warn('No active members found for mandatory savings creation')
                return
            }

            // Get configured mandatory savings amount
            const mandatorySavingsAmount = this.getMandatorySavingsAmount()
            this.logger.log(`Using mandatory savings amount: ${mandatorySavingsAmount}`)

            // Create mandatory savings records for all active members for 12 months
            const userIds = activeMembers.map(user => user.id)
            const createdCount = await this.savingsRepository.createYearlyMandatorySavingsForUsers(
                userIds,
                mandatorySavingsAmount
            )

            this.logger.log(`Successfully processed ${createdCount} mandatory savings records (12 months) for ${activeMembers.length} active members`)

            // Log individual user processing for monitoring
            activeMembers.forEach(user => {
                this.logger.debug(`Processed yearly mandatory savings for member: ${user.id} (${user.fullname})`)
            })

        } catch (error) {
            this.logger.error('Failed to create yearly mandatory savings:', error)
            throw new InternalServerErrorException('Failed to create yearly mandatory savings records')
        }
    }

    /**
     * Get the configured mandatory savings amount with validation
     */
    private getMandatorySavingsAmount(): number {
        const amount = this.configService.get<number>('MANDATORY_SAVINGS_DEFAULT_AMOUNT', 500000)

        if (amount <= 0) {
            this.logger.warn(`Invalid mandatory savings amount configured: ${amount}. Using default: 500000`)
            return 500000
        }

        return amount
    }

    /**
     * Validate period parameter format
     */
    private validatePeriodParameter(period: string): void {
        const validMonths = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ]

        if (!validMonths.includes(period.toLowerCase())) {
            throw new BadRequestException(
                `Invalid period parameter: ${period}. Must be a valid month name in English (e.g., january, february, etc.)`
            )
        }
    }

    /**
     * Apply default date range configuration when no period is specified
     */
    private applyDefaultDateRange(queryParams: SavingsQueryDto): SavingsQueryDto {
        if (queryParams.period) {
            return queryParams
        }

        // If no period specified, the repository will apply the default 30-day range
        // This method can be extended to apply other default configurations
        const defaultDateRangeDays = this.getDefaultDateRangeDays()

        this.logger.debug(`Applying default date range of ${defaultDateRangeDays} days`)

        return queryParams
    }

    /**
     * Get the configured default date range in days with validation
     */
    private getDefaultDateRangeDays(): number {
        const days = this.configService.get<number>('SAVINGS_DEFAULT_DATE_RANGE_DAYS', 30)

        if (days <= 0 || days > 365) {
            this.logger.warn(`Invalid default date range configured: ${days}. Using default: 30`)
            return 30
        }

        return days
    }

    /**
     * Check if automatic monthly record creation is enabled
     */
    isAutoCreationEnabled(): boolean {
        const enabled = this.configService.get<boolean>('MANDATORY_SAVINGS_AUTO_CREATION_ENABLED', true)
        this.logger.debug(`Automatic mandatory savings creation enabled: ${enabled}`)
        return enabled
    }

    /**
     * Get the cron schedule for monthly record creation
     */
    getCronSchedule(): string {
        const schedule = this.configService.get<string>('MANDATORY_SAVINGS_CRON_SCHEDULE', '0 0 1 * *')
        this.logger.debug(`Mandatory savings cron schedule: ${schedule}`)
        return schedule
    }

    /**
     * Generate mandatory savings for remaining months of current year
     * Development/manual trigger endpoint
     */
    async generateRemainingYearSavings(): Promise<{
        message: string
        months_generated: number
        users_count: number
        total_records: number
        months: string[]
    }> {
        this.logger.log('Generating mandatory savings for remaining months of current year')

        try {
            // Get all active users
            const allUsers = await this.usersService.findAll()

            // Filter for active members only (exclude admin and superadmin)
            const activeMembers = allUsers.filter(user =>
                user.status === 'active' && user.role_id === 'member'
            )

            this.logger.log(`Found ${activeMembers.length} active members out of ${allUsers.length} total users`)

            if (activeMembers.length === 0) {
                this.logger.warn('No active members found')
                return {
                    message: 'No active members found to generate savings for',
                    months_generated: 0,
                    users_count: 0,
                    total_records: 0,
                    months: []
                }
            }

            // Get current date and calculate remaining months
            const currentDate = new Date()
            const currentMonth = currentDate.getMonth() // 0-11
            const currentYear = currentDate.getFullYear()
            const remainingMonths = 12 - currentMonth // From current month to December

            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ]

            const generatedMonths: string[] = []
            for (let i = currentMonth; i < 12; i++) {
                generatedMonths.push(monthNames[i])
            }

            this.logger.log(`Generating savings for ${remainingMonths} months: ${generatedMonths.join(', ')}`)

            // Get configured mandatory savings amount
            const mandatorySavingsAmount = this.getMandatorySavingsAmount()
            this.logger.log(`Using mandatory savings amount: ${mandatorySavingsAmount}`)

            // Create mandatory savings records for members only
            const userIds = activeMembers.map(user => user.id)
            const createdCount = await this.savingsRepository.generateRemainingYearSavings(
                userIds,
                mandatorySavingsAmount,
                currentYear,
                currentMonth
            )

            const message = `Successfully generated mandatory savings for ${remainingMonths} months (${generatedMonths.join(', ')}) for ${activeMembers.length} active members`

            this.logger.log(message)

            return {
                message,
                months_generated: remainingMonths,
                users_count: activeMembers.length,
                total_records: createdCount,
                months: generatedMonths
            }
        } catch (error) {
            this.logger.error('Failed to generate remaining year savings:', error)
            throw new InternalServerErrorException('Failed to generate mandatory savings records')
        }
    }

    /**
     * Get all savings-related configuration values for monitoring/debugging
     */
    getSavingsConfiguration(): Record<string, any> {
        return {
            mandatorySavingsAmount: this.getMandatorySavingsAmount(),
            defaultDateRangeDays: this.getDefaultDateRangeDays(),
            autoCreationEnabled: this.isAutoCreationEnabled(),
            cronSchedule: this.getCronSchedule()
        }
    }
}
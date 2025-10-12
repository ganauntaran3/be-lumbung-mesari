import { Injectable, Logger } from '@nestjs/common'
import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import {
    MandatorySavingsTable,
    MandatorySavingsWithUser,
    MandatorySavingsPaginatedResponse,
    UpdateMandatorySavings
} from './interfaces/mandatory-savings.interface'
import { SavingsQueryDto } from './dto/savings-query.dto'

@Injectable()
export class SavingsRepository extends BaseRepository<MandatorySavingsTable> {
    private readonly logger = new Logger(SavingsRepository.name)

    constructor(protected readonly databaseService: DatabaseService) {
        super(databaseService, 'mandatory_savings')
    }

    /**
     * Find all mandatory savings with user information and pagination
     * Supports period filtering and default 30-day range
     */
    async findAllWithUsers(
        options: SavingsQueryDto
    ): Promise<MandatorySavingsPaginatedResponse> {
        try {
            const {
                period,
                page = 1,
                limit = 10,
                sortBy = 'period_date',
                sortOrder = 'desc'
            } = options

            this.logger.debug(`Finding mandatory savings with options: ${JSON.stringify(options)}`)

            const offset = (page - 1) * limit

            // Build base query with joins
            let baseQuery = this.knex('mandatory_savings as ms')
                .join('users as u', 'ms.user_id', 'u.id')
                .leftJoin('users as pb', 'ms.processed_by', 'pb.id')

            // Apply period filtering if provided
            if (period) {
                const { startDate, endDate } = this.convertPeriodToDateRange(period)
                baseQuery = baseQuery.whereBetween('ms.period_date', [startDate, endDate])
                this.logger.debug(`Applied period filter: ${period} (${startDate} to ${endDate})`)
            } else {
                // Default to last 30 days
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                baseQuery = baseQuery.where('ms.period_date', '>=', thirtyDaysAgo)
                this.logger.debug(`Applied default 30-day filter from: ${thirtyDaysAgo}`)
            }

            // Count query
            const [{ count }] = await baseQuery.clone().count('ms.id as count')
            const totalData = parseInt(count as string, 10)

            // Data query with proper column selection to avoid sensitive data
            const data = await baseQuery
                .select([
                    'ms.id',
                    'ms.period_date',
                    'ms.amount',
                    'ms.status',
                    'ms.paid_at',
                    'ms.created_at',
                    'ms.updated_at',
                    'ms.processed_by',
                    'u.id as user_id',
                    'u.fullname as user_fullname',
                    'u.email as user_email',
                    'u.username as user_username',
                    'pb.id as processed_by_user_id',
                    'pb.fullname as processed_by_user_fullname'
                ])
                .orderBy(`ms.${sortBy}`, sortOrder)
                .orderBy('u.fullname', 'asc')
                .limit(limit)
                .offset(offset)

            // Transform data to match interface
            const transformedData: MandatorySavingsWithUser[] = data.map(row => ({
                id: row.id,
                period_date: row.period_date,
                amount: row.amount,
                status: row.status,
                paid_at: row.paid_at,
                created_at: row.created_at,
                updated_at: row.updated_at,
                processed_by: row.processed_by,
                user: {
                    id: row.user_id,
                    fullname: row.user_fullname,
                    email: row.user_email,
                    username: row.user_username
                },
                processed_by_user: row.processed_by_user_id ? {
                    id: row.processed_by_user_id,
                    fullname: row.processed_by_user_fullname
                } : undefined
            }))

            const pagination = this.createPaginationMetadata(page, limit, totalData)

            this.logger.debug(`Found ${transformedData.length} records out of ${totalData} total`)

            return {
                data: transformedData,
                ...pagination
            }
        } catch (error) {
            this.logger.error('Failed to find mandatory savings with users:', error)
            throw error
        }
    }

    /**
     * Find mandatory savings for a specific user with pagination
     * Supports period filtering and default 30-day range
     */
    async findByUserIdWithPagination(
        userId: string,
        options: SavingsQueryDto
    ): Promise<MandatorySavingsPaginatedResponse> {
        try {
            const {
                period,
                page = 1,
                limit = 10,
                sortBy = 'period_date',
                sortOrder = 'desc'
            } = options

            this.logger.debug(`Finding mandatory savings for user ${userId} with options: ${JSON.stringify(options)}`)

            const offset = (page - 1) * limit

            // Build base query with joins
            let baseQuery = this.knex('mandatory_savings as ms')
                .join('users as u', 'ms.user_id', 'u.id')
                .leftJoin('users as pb', 'ms.processed_by', 'pb.id')
                .where('ms.user_id', userId)

            // Apply period filtering if provided
            if (period) {
                const { startDate, endDate } = this.convertPeriodToDateRange(period)
                baseQuery = baseQuery.whereBetween('ms.period_date', [startDate, endDate])
                this.logger.debug(`Applied period filter: ${period} (${startDate} to ${endDate})`)
            } else {
                // Default to last 30 days
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                baseQuery = baseQuery.where('ms.period_date', '>=', thirtyDaysAgo)
                this.logger.debug(`Applied default 30-day filter from: ${thirtyDaysAgo}`)
            }

            // Count query
            const [{ count }] = await baseQuery.clone().count('ms.id as count')
            const totalData = parseInt(count as string, 10)

            // Data query with proper column selection to avoid sensitive data
            const data = await baseQuery
                .select([
                    'ms.id',
                    'ms.period_date',
                    'ms.amount',
                    'ms.status',
                    'ms.paid_at',
                    'ms.created_at',
                    'ms.updated_at',
                    'ms.processed_by',
                    'u.id as user_id',
                    'u.fullname as user_fullname',
                    'u.email as user_email',
                    'u.username as user_username',
                    'pb.id as processed_by_user_id',
                    'pb.fullname as processed_by_user_fullname'
                ])
                .orderBy(`ms.${sortBy}`, sortOrder)
                .limit(limit)
                .offset(offset)

            // Transform data to match interface
            const transformedData: MandatorySavingsWithUser[] = data.map(row => ({
                id: row.id,
                period_date: row.period_date,
                amount: row.amount,
                status: row.status,
                paid_at: row.paid_at,
                created_at: row.created_at,
                updated_at: row.updated_at,
                processed_by: row.processed_by,
                user: {
                    id: row.user_id,
                    fullname: row.user_fullname,
                    email: row.user_email,
                    username: row.user_username
                },
                processed_by_user: row.processed_by_user_id ? {
                    id: row.processed_by_user_id,
                    fullname: row.processed_by_user_fullname
                } : undefined
            }))

            const pagination = this.createPaginationMetadata(page, limit, totalData)

            this.logger.debug(`Found ${transformedData.length} records for user ${userId} out of ${totalData} total`)

            return {
                data: transformedData,
                ...pagination
            }
        } catch (error) {
            this.logger.error(`Failed to find mandatory savings for user ${userId}:`, error)
            throw error
        }
    }

    /**
     * Generate mandatory savings for remaining months of current year
     * Used for development/manual trigger
     */
    async generateRemainingYearSavings(
        userIds: string[],
        amount: number,
        year: number,
        startMonth: number
    ): Promise<number> {
        const trx = await this.knex.transaction()

        try {
            // Generate records from startMonth to December (month 11)
            const records = []
            for (let month = startMonth; month < 12; month++) {
                // Use UTC to ensure consistent dates regardless of server timezone
                const periodDate = new Date(Date.UTC(year, month, 1))

                for (const userId of userIds) {
                    records.push({
                        user_id: userId,
                        period_date: periodDate,
                        amount: amount.toString(),
                        status: 'due' as const,
                        created_at: new Date(),
                        updated_at: new Date()
                    })
                }
            }

            this.logger.log(`Creating ${records.length} mandatory savings records for ${userIds.length} users for remaining months of ${year}`)

            // Use ON CONFLICT to prevent duplicates
            await trx('mandatory_savings')
                .insert(records)
                .onConflict(['user_id', 'period_date'])
                .ignore()

            await trx.commit()

            this.logger.log(`Successfully processed ${records.length} mandatory savings records (duplicates ignored)`)

            return records.length
        } catch (error) {
            await trx.rollback()
            this.logger.error('Failed to generate remaining year mandatory savings records:', error)
            throw error
        }
    }

    /**
     * Update mandatory savings record by ID
     * Only allows updating status, payment, and processing information
     */
    async updateMandatorySavings(
        id: string,
        updateData: UpdateMandatorySavings
    ): Promise<MandatorySavingsTable> {
        try {
            this.logger.debug(`Updating mandatory savings ${id} with data: ${JSON.stringify(updateData)}`)

            const [result] = await this.knex(this.tableName)
                .where('id', id)
                .update({
                    ...updateData,
                    updated_at: new Date()
                })
                .returning('*')

            if (!result) {
                throw new Error(`Mandatory savings record with id ${id} not found`)
            }

            this.logger.debug(`Successfully updated mandatory savings ${id}`)
            return result as MandatorySavingsTable
        } catch (error) {
            this.logger.error(`Failed to update mandatory savings ${id}:`, error)
            throw error
        }
    }

    /**
     * Create mandatory savings records for multiple users for the entire year (12 months)
     * Uses database transactions and handles duplicates with ON CONFLICT
     */
    async createYearlyMandatorySavingsForUsers(
        userIds: string[],
        amount: number
    ): Promise<number> {
        const trx = await this.knex.transaction()

        try {
            const currentDate = new Date()
            const currentYear = currentDate.getFullYear()

            // Generate records for all 12 months of the current year
            const records = []
            for (let month = 0; month < 12; month++) {
                // Use UTC to ensure consistent dates regardless of server timezone
                const periodDate = new Date(Date.UTC(currentYear, month, 1))

                for (const userId of userIds) {
                    records.push({
                        user_id: userId,
                        period_date: periodDate,
                        amount: amount.toString(),
                        status: 'due' as const,
                        created_at: new Date(),
                        updated_at: new Date()
                    })
                }
            }

            this.logger.log(`Creating ${records.length} mandatory savings records for ${userIds.length} users for year ${currentYear} (12 months)`)

            // Use ON CONFLICT to prevent duplicates
            await trx('mandatory_savings')
                .insert(records)
                .onConflict(['user_id', 'period_date'])
                .ignore()

            await trx.commit()

            this.logger.log(`Successfully processed ${records.length} mandatory savings records (duplicates ignored)`)

            // Return the number of records that were attempted to be inserted
            // Note: Due to ON CONFLICT IGNORE, actual inserted count may be less
            return records.length
        } catch (error) {
            await trx.rollback()
            this.logger.error('Failed to create yearly mandatory savings records:', error)
            throw error
        }
    }

    /**
     * Convert month name to date range for the current year
     * Handles current year assumption for period filtering
     */
    private convertPeriodToDateRange(period: string): { startDate: Date; endDate: Date } {
        try {
            const currentYear = new Date().getFullYear()
            const monthNames = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'
            ]

            const monthIndex = monthNames.indexOf(period.toLowerCase())

            if (monthIndex === -1) {
                this.logger.error(`Invalid period provided: ${period}`)
                throw new Error(`Invalid period: ${period}. Must be a valid month name in English.`)
            }

            // Use UTC to ensure consistent dates regardless of server timezone
            const startDate = new Date(Date.UTC(currentYear, monthIndex, 1))
            const endDate = new Date(Date.UTC(currentYear, monthIndex + 1, 0)) // Last day of the month

            this.logger.debug(`Converted period '${period}' to date range: ${startDate.toISOString()} - ${endDate.toISOString()}`)

            return { startDate, endDate }
        } catch (error) {
            this.logger.error(`Failed to convert period to date range: ${period}`, error)
            throw error
        }
    }
}
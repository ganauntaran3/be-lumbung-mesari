import { Injectable, Logger } from '@nestjs/common'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'
import { PaginationResult } from '../interface/pagination'

import { SavingsQueryDto } from './dto/savings-query.dto'
import {
  MandatorySavingsPaginatedResponse,
  MandatorySavingsTable,
  MandatorySavingsWithUser,
  UpdateMandatorySavings
} from './interfaces/mandatory-savings.interface'

@Injectable()
export class MandatorySavingsRepository extends BaseRepository<MandatorySavingsTable> {
  private readonly logger = new Logger(MandatorySavingsRepository.name)

  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService, 'mandatory_savings')
  }

  private readonly allowedSortColumns: Record<string, string> = {
    period_date: 'ms.period_date',
    amount: 'ms.amount',
    status: 'ms.status',
    paid_at: 'ms.paid_at',
    created_at: 'ms.created_at',
    updated_at: 'ms.updated_at'
  }

  private getSafeSortColumn(sortBy: string): string {
    return this.allowedSortColumns[sortBy] || 'ms.period_date'
  }

  async findAllWithUsers(
    options: SavingsQueryDto
  ): Promise<MandatorySavingsPaginatedResponse> {
    try {
      const {
        period,
        year,
        page = 1,
        limit = 10,
        sortBy = 'period_date',
        sortOrder = 'desc'
      } = options

      this.logger.debug(
        `Finding mandatory savings with options: ${JSON.stringify(options)}`
      )

      const offset = (page - 1) * limit

      let baseQuery = this.knex('mandatory_savings as ms')
        .join('users as u', 'ms.user_id', 'u.id')
        .leftJoin('users as pb', 'ms.processed_by', 'pb.id')

      if (period) {
        // Period with optional year (e.g., period=october or period=october&year=2025)
        const { startDate, endDate } = this.convertPeriodToDateRange(
          period,
          year
        )
        baseQuery = baseQuery.whereBetween('ms.period_date', [
          startDate,
          endDate
        ])
        this.logger.debug(
          `Applied period filter: ${period} ${year || 'current year'} (${startDate} to ${endDate})`
        )
      } else {
        // Default to last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        baseQuery = baseQuery.where('ms.period_date', '>=', thirtyDaysAgo)
        this.logger.debug(
          `Applied default 30-day filter from: ${thirtyDaysAgo}`
        )
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
        .orderBy(this.getSafeSortColumn(sortBy), sortOrder)
        .orderBy('u.fullname', 'asc')
        .limit(limit)
        .offset(offset)

      // Transform data to match interface
      const transformedData: MandatorySavingsWithUser[] = data.map((row) => ({
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
        processed_by_user: row.processed_by_user_id
          ? {
              id: row.processed_by_user_id,
              fullname: row.processed_by_user_fullname
            }
          : undefined
      }))

      const pagination = this.createPaginationMetadata(page, limit, totalData)

      this.logger.debug(
        `Found ${transformedData.length} records out of ${totalData} total`
      )

      return {
        data: transformedData,
        ...pagination
      }
    } catch (error) {
      this.logger.error('Failed to find mandatory savings with users:', error)
      throw error
    }
  }

  async findByUserIdWithPagination(
    userId: string,
    options: SavingsQueryDto
  ): Promise<MandatorySavingsPaginatedResponse> {
    try {
      const {
        period,
        year,
        page = 1,
        limit = 10,
        sortBy = 'period_date',
        sortOrder = 'desc'
      } = options

      this.logger.debug(
        `Finding mandatory savings for user ${userId} with options: ${JSON.stringify(options)}`
      )

      const offset = (page - 1) * limit

      let baseQuery = this.knex('mandatory_savings as ms')
        .join('users as u', 'ms.user_id', 'u.id')
        .leftJoin('users as pb', 'ms.processed_by', 'pb.id')
        .where('ms.user_id', userId)

      if (period) {
        // Period with optional year (e.g., period=october or period=october&year=2025)
        const { startDate, endDate } = this.convertPeriodToDateRange(
          period,
          year
        )
        baseQuery = baseQuery.whereBetween('ms.period_date', [
          startDate,
          endDate
        ])
        this.logger.debug(
          `Applied period filter: ${period} ${year || 'current year'} (${startDate} to ${endDate})`
        )
      } else {
        // Default to last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        baseQuery = baseQuery.where('ms.period_date', '>=', thirtyDaysAgo)
        this.logger.debug(
          `Applied default 30-day filter from: ${thirtyDaysAgo}`
        )
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
        .orderBy(this.getSafeSortColumn(sortBy), sortOrder)
        .limit(limit)
        .offset(offset)

      // Transform data to match interface
      const transformedData: MandatorySavingsWithUser[] = data.map((row) => ({
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
        processed_by_user: row.processed_by_user_id
          ? {
              id: row.processed_by_user_id,
              fullname: row.processed_by_user_fullname
            }
          : undefined
      }))

      const pagination = this.createPaginationMetadata(page, limit, totalData)

      this.logger.debug(
        `Found ${transformedData.length} records for user ${userId} out of ${totalData} total`
      )

      return {
        data: transformedData,
        ...pagination
      }
    } catch (error) {
      this.logger.error(
        `Failed to find mandatory savings for user ${userId}:`,
        error
      )
      throw error
    }
  }

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

      this.logger.log(
        `Creating ${records.length} mandatory savings records for ${userIds.length} users for remaining months of ${year}`
      )

      // Use ON CONFLICT to prevent duplicates
      await trx('mandatory_savings')
        .insert(records)
        .onConflict(['user_id', 'period_date'])
        .ignore()

      await trx.commit()

      this.logger.log(
        `Successfully processed ${records.length} mandatory savings records (duplicates ignored)`
      )

      return records.length
    } catch (error) {
      await trx.rollback()
      this.logger.error(
        'Failed to generate remaining year mandatory savings records:',
        error
      )
      throw error
    }
  }

  async updateMandatorySavings(
    id: string,
    updateData: UpdateMandatorySavings,
    trx?: any
  ): Promise<MandatorySavingsTable> {
    try {
      this.logger.debug(
        `Updating mandatory savings ${id} with data: ${JSON.stringify(updateData)}`
      )

      const query = trx ? trx('mandatory_savings') : this.knex(this.tableName)
      const [result] = await query
        .where('id', id)
        .update(updateData)
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

  async findMandatorySavingsById(id: string, trx?: any) {
    this.logger.debug(`Finding mandatory savings by ID ${id}`)

    const query = trx
      ? trx('mandatory_savings as ms')
      : this.knex('mandatory_savings as ms')

    const result = await query
      .where('ms.id', id)
      .select([
        'ms.id',
        'ms.period_date',
        'ms.amount',
        'ms.status',
        'ms.paid_at',
        'ms.created_at',
        'ms.updated_at',
        'ms.processed_by'
      ])
      .first()

    if (!result) {
      return null
    }

    return {
      id: result.id,
      period_date: result.period_date,
      amount: result.amount,
      status: result.status,
      paid_at: result.paid_at,
      created_at: result.created_at,
      updated_at: result.updated_at,
      processed_by: result.processed_by
    }
  }

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

      this.logger.log(
        `Creating ${records.length} mandatory savings records for ${userIds.length} users for year ${currentYear} (12 months)`
      )

      // Use ON CONFLICT to prevent duplicates
      await trx('mandatory_savings')
        .insert(records)
        .onConflict(['user_id', 'period_date'])
        .ignore()

      await trx.commit()

      this.logger.log(
        `Successfully processed ${records.length} mandatory savings records (duplicates ignored)`
      )

      // Return the number of records that were attempted to be inserted
      // Note: Due to ON CONFLICT IGNORE, actual inserted count may be less
      return records.length
    } catch (error) {
      await trx.rollback()
      this.logger.error(
        'Failed to create yearly mandatory savings records:',
        error
      )
      throw error
    }
  }

  /**
   * Convert month name to date range for specified or current year
   * Handles year parameter for period filtering
   */
  private convertPeriodToDateRange(
    period: string,
    year?: number
  ): { startDate: Date; endDate: Date } {
    try {
      const targetYear = year || new Date().getFullYear()
      const monthNames = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december'
      ]

      const monthIndex = monthNames.indexOf(period.toLowerCase())

      if (monthIndex === -1) {
        this.logger.error(`Invalid period provided: ${period}`)
        throw new Error(
          `Invalid period: ${period}. Must be a valid month name in English.`
        )
      }

      // Use UTC to ensure consistent dates regardless of server timezone
      const startDate = new Date(Date.UTC(targetYear, monthIndex, 1))
      const endDate = new Date(Date.UTC(targetYear, monthIndex + 1, 0)) // Last day of the month

      this.logger.debug(
        `Converted period '${period}' (year: ${targetYear}) to date range: ${startDate.toISOString()} - ${endDate.toISOString()}`
      )

      return { startDate, endDate }
    } catch (error) {
      this.logger.error(
        `Failed to convert period to date range: ${period}`,
        error
      )
      throw error
    }
  }

  /**
   * Find all paid mandatory savings for a specific year with pagination
   * Used for report generation - filters at database level
   */
  async findPaidMandatorySavingsByYear(
    year: number,
    page: number = 1,
    limit: number = 100
  ): Promise<
    PaginationResult<{
      user_id: string
      fullname: string
      period_date: Date
      amount: string
    }>
  > {
    try {
      const startDate = new Date(year, 0, 1) // January 1st
      const endDate = new Date(year, 11, 31, 23, 59, 59) // December 31st
      const offset = (page - 1) * limit

      this.logger.debug(
        `Fetching paid mandatory savings for year ${year}, page ${page}, limit ${limit}`
      )

      // Get total count
      const [{ count }] = await this.knex('mandatory_savings as ms')
        .join('users as u', 'ms.user_id', 'u.id')
        .where('ms.status', 'paid')
        .whereBetween('ms.period_date', [startDate, endDate])
        .count('ms.id as count')

      const totalData = parseInt(count as string, 10)

      // Get paginated data
      const data = await this.knex('mandatory_savings as ms')
        .join('users as u', 'ms.user_id', 'u.id')
        .where('ms.status', 'paid')
        .whereBetween('ms.period_date', [startDate, endDate])
        .select(['ms.user_id', 'u.fullname', 'ms.period_date', 'ms.amount'])
        .orderBy('u.fullname', 'asc')
        .orderBy('ms.period_date', 'asc')
        .limit(limit)
        .offset(offset)

      const pagination = this.createPaginationMetadata(page, limit, totalData)

      this.logger.debug(
        `Found ${data.length} paid savings records for year ${year} (page ${page}/${pagination.totalPage})`
      )

      return {
        data,
        ...pagination
      }
    } catch (error) {
      this.logger.error(
        `Failed to find paid mandatory savings for year ${year}:`,
        error
      )
      throw error
    }
  }
}

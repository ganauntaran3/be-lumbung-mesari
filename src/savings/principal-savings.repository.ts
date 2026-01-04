import { Injectable, Logger } from '@nestjs/common'

import { BaseRepository } from '../database/base.repository'
import { DatabaseService } from '../database/database.service'

import {
  PrincipalSavingsTable,
  PrincipalSavingsWithUser,
  UpdatePrincipalSavings
} from './interfaces/principal-savings.interface'

@Injectable()
export class PrincipalSavingsRepository extends BaseRepository<PrincipalSavingsTable> {
  private readonly logger = new Logger(PrincipalSavingsRepository.name)

  constructor(protected readonly databaseService: DatabaseService) {
    super(databaseService, 'mandatory_savings')
  }

  /**
   * Create a principal savings record for a user
   * @param data - Principal savings data
   * @param trx - Optional transaction object
   */
  async createPrincipalSavings(
    data: Omit<PrincipalSavingsTable, 'id' | 'created_at' | 'updated_at'>,
    trx?: any
  ): Promise<PrincipalSavingsTable> {
    try {
      this.logger.debug(`Creating principal savings for user ${data.user_id}`)

      const query = trx
        ? trx('principal_savings')
        : this.knex('principal_savings')
      const [result] = await query
        .insert({
          ...data,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*')

      this.logger.log(
        `Principal savings created successfully for user ${data.user_id}`
      )
      return result as PrincipalSavingsTable
    } catch (error) {
      this.logger.error(
        `Failed to create principal savings for user ${data.user_id}:`,
        error
      )
      throw error
    }
  }

  /**
   * Find principal savings by user ID with user information
   */
  async findPrincipalSavingsByUserId(
    userId: string
  ): Promise<PrincipalSavingsWithUser | null> {
    try {
      this.logger.debug(`Finding principal savings for user ${userId}`)

      const result = await this.knex('principal_savings as ps')
        .join('users as u', 'ps.user_id', 'u.id')
        .leftJoin('users as pb', 'ps.processed_by', 'pb.id')
        .where('ps.user_id', userId)
        .select([
          'ps.id',
          'ps.amount',
          'ps.status',
          'ps.processed_by',
          'ps.paid_at',
          'ps.created_at',
          'ps.updated_at',
          'u.id as user_id',
          'u.fullname as user_fullname',
          'u.email as user_email',
          'u.username as user_username',
          'pb.id as processed_by_user_id',
          'pb.fullname as processed_by_user_fullname'
        ])
        .first()

      if (!result) {
        this.logger.debug(`No principal savings found for user ${userId}`)
        return null
      }

      return {
        id: result.id,
        amount: result.amount,
        status: result.status,
        processed_by: result.processed_by,
        paid_at: result.paid_at,
        created_at: result.created_at,
        updated_at: result.updated_at,
        user: {
          id: result.user_id,
          fullname: result.user_fullname,
          email: result.user_email,
          username: result.user_username
        },
        processed_by_user: result.processed_by_user_id
          ? {
              id: result.processed_by_user_id,
              fullname: result.processed_by_user_fullname
            }
          : undefined
      }
    } catch (error) {
      this.logger.error(
        `Failed to find principal savings for user ${userId}:`,
        error
      )
      throw error
    }
  }

  async updatePrincipalSavings(
    id: string,
    updateData: UpdatePrincipalSavings,
    trx?: any
  ): Promise<PrincipalSavingsTable> {
    try {
      this.logger.debug(
        `Updating principal savings ${id} with data: ${JSON.stringify(updateData)}`
      )

      const query = trx
        ? trx('principal_savings')
        : this.knex('principal_savings')
      const [result] = await query
        .where('id', id)
        .update(updateData)
        .returning('*')

      if (!result) {
        throw new Error(`Principal savings record with id ${id} not found`)
      }

      this.logger.debug(`Successfully updated principal savings ${id}`)
      return result as PrincipalSavingsTable
    } catch (error) {
      this.logger.error(`Failed to update principal savings ${id}:`, error)
      throw error
    }
  }
}

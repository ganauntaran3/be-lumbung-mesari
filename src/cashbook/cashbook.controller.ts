import { Controller, Get, Logger, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger'

import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { TokenErrorSchemas } from '../common/schema/error-schema'

import { CashbookBalanceService } from './cashbook-balance.service'
import { getBalanceResponseSchema } from './dto/balance.dto'

@ApiTags('Cashbook')
@Controller('cashbook')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CashbookController {
  private readonly logger = new Logger(CashbookController.name)

  constructor(
    private readonly cashbookBalanceService: CashbookBalanceService
  ) {}

  @Get('balances')
  @ApiOperation({
    summary: 'Get current cashbook balances',
    description: 'Retrieve current balances for total, capital, and SHU.'
  })
  @ApiResponse({
    status: 200,
    description: 'Balances retrieved successfully',
    schema: getBalanceResponseSchema
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: TokenErrorSchemas.invalidToken
  })
  async getBalances() {
    try {
      this.logger.log('Retrieving cashbook balances...')
      return await this.cashbookBalanceService.getCurrentBalances()
    } catch (error) {
      this.logger.error('Failed to retrieve cashbook balances:', error)
      throw error
    }
  }
}

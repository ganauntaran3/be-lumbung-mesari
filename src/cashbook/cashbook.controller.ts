import { Controller, Get, Logger, Query, UseGuards, ValidationPipe } from '@nestjs/common'
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
import { CashbookTransactionService } from './cashbook-transaction.service'
import { getBalanceResponseSchema } from './dto/balance.dto'
import {
  CashbookTransactionsPaginatedResponseDto,
  GetTransactionsQueryDto
} from './dto/transaction.dto'

@ApiTags('Cashbook')
@Controller('cashbook')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CashbookController {
  private readonly logger = new Logger(CashbookController.name)

  constructor(
    private readonly cashbookBalanceService: CashbookBalanceService,
    private readonly cashbookTransactionService: CashbookTransactionService
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

  @Get('transactions')
  @ApiOperation({
    summary: 'Get transaction history',
    description: 'Retrieve paginated cashbook transaction history with category.'
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: CashbookTransactionsPaginatedResponseDto
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: TokenErrorSchemas.invalidToken
  })
  async getTransactions(
    @Query(new ValidationPipe({ transform: true })) query: GetTransactionsQueryDto
  ) {
    try {
      this.logger.log(`Retrieving transaction history: page=${query.page}, limit=${query.limit}`)
      return await this.cashbookTransactionService.listTransactions(
        query.page ?? 1,
        query.limit ?? 10
      )
    } catch (error) {
      this.logger.error('Failed to retrieve transaction history:', error)
      throw error
    }
  }
}

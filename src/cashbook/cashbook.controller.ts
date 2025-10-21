import { Controller, Get, UseGuards, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger'
import { CashbookBalanceService } from './cashbook-balance.service'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../common/constants'

@ApiTags('Cashbook')
@Controller('cashbook')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class CashbookController {
    private readonly logger = new Logger(CashbookController.name)

    constructor(private readonly cashbookBalanceService: CashbookBalanceService) { }

    @Get('balances')
    @ApiOperation({
        summary: 'Get current cashbook balances',
        description: 'Retrieve current balances for total, capital, and SHU. Only accessible by administrators and superadministrators.'
    })
    @ApiResponse({
        status: 200,
        description: 'Balances retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                total: {
                    type: 'number',
                    example: 5000000,
                    description: 'Total cashbook balance (capital + shu)'
                },
                capital: {
                    type: 'number',
                    example: 3000000,
                    description: 'Capital balance (simpanan pokok + simpanan wajib)'
                },
                shu: {
                    type: 'number',
                    example: 2000000,
                    description: 'SHU balance (profit available for distribution)'
                }
            }
        }
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized - Invalid or missing token'
    })
    @ApiForbiddenResponse({
        description: 'Forbidden - Insufficient permissions (Admin/SuperAdmin required)'
    })
    async getBalances() {
        try {
            this.logger.log('Admin requested cashbook balances')

            const balances = await this.cashbookBalanceService.getCurrentBalances()

            const response = {
                total: balances.total,
                capital: balances.capital,
                shu: balances.shu
            }

            this.logger.log('Cashbook balances retrieved successfully')

            return response
        } catch (error) {
            this.logger.error('Failed to retrieve cashbook balances:', error)
            throw error
        }
    }
}
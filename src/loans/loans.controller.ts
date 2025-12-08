import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse
} from '@nestjs/swagger'
import {
  AuthErrorSchemas,
  BadRequestResponseSchema,
  NotFoundResponseSchema
} from 'src/common/schema/error-schema'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserRole } from '../common/constants'
import { UserJWT } from '../users/interface/users'

import { CreateLoanDto } from './dto/create-loan.dto'
import {
  CalculateLoanRequestDto,
  CalculateLoanResponseDto
} from './dto/calculate-loan.dto'
import {
  ApproveLoanDto,
  LoanApprovalResponseDto,
  RejectLoanDto
} from './dto/loan-approval.dto'
import { LoansQueryDto } from './dto/loans-query.dto'
import { LoansService } from './loans.service'

@ApiTags('Loans')
@Controller('loans')
@ApiBearerAuth()
export class LoansController {
  private readonly logger = new Logger(LoansController.name)

  constructor(private readonly loansService: LoansService) {}

  @Get('periods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get all available loan periods',
    description:
      'Retrieve all loan period options with tenor and interest rates'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Loan periods retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenor: { type: 'number', example: 12 },
          interestRate: { type: 'number', example: 1 }
        }
      }
    }
  })
  async getLoanPeriods() {
    return await this.loansService.findAllPeriods()
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Calculate loan details',
    description:
      'Preview loan calculation without creating a loan request. Shows monthly payment and total payable with rounding.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Loan calculation completed successfully',
    type: CalculateLoanResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid input data',
    schema: BadRequestResponseSchema
  })
  @ApiNotFoundResponse({
    description: 'Loan period not found',
    schema: NotFoundResponseSchema
  })
  async calculateLoan(@Body() calculateDto: CalculateLoanRequestDto) {
    return await this.loansService.calculateLoan(calculateDto)
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get all loans with pagination and filtering',
    description: 'Retrieve all loans. Admin and SuperAdmin only.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Loans retrieved successfully'
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: AuthErrorSchemas.invalidCredentials
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    schema: AuthErrorSchemas.insufficientPermissions
  })
  async findAll(@Query() queryDto: LoansQueryDto) {
    return await this.loansService.findAll(queryDto)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a new loan request',
    description: 'Allows authenticated users to request a loan'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Loan request created successfully'
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid loan data'
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: AuthErrorSchemas.invalidCredentials
  })
  async createLoan(
    @CurrentUser() user: UserJWT,
    @Body() createLoanDto: CreateLoanDto
  ) {
    return await this.loansService.createLoan(user.id, createLoanDto)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get loan details by ID',
    description: 'Retrieve detailed information about a specific loan'
  })
  @ApiParam({
    name: 'id',
    description: 'Loan ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Loan details retrieved successfully'
  })
  @ApiNotFoundResponse({
    description: 'Loan not found',
    schema: NotFoundResponseSchema
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: AuthErrorSchemas.invalidCredentials
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    schema: AuthErrorSchemas.insufficientPermissions
  })
  async findOne(@Param('id') id: string) {
    return await this.loansService.findById(id)
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Approve a loan request',
    description:
      'Approve a pending loan request and generate installments. SuperAdmin only.'
  })
  @ApiParam({
    name: 'id',
    description: 'Loan ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Loan approved successfully',
    type: LoanApprovalResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid loan status'
  })
  @ApiNotFoundResponse({
    description: 'Loan not found',
    schema: NotFoundResponseSchema
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: AuthErrorSchemas.invalidCredentials
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    schema: AuthErrorSchemas.insufficientPermissions
  })
  async approveLoan(
    @Param('id') loanId: string,
    @Body() approvalDto: ApproveLoanDto,
    @CurrentUser() admin: UserJWT
  ): Promise<LoanApprovalResponseDto> {
    return await this.loansService.approveLoan(loanId, approvalDto, admin.id)
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Reject a loan request',
    description: 'Reject a pending loan request. SuperAdmin only.'
  })
  @ApiParam({
    name: 'id',
    description: 'Loan ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Loan rejected successfully',
    type: LoanApprovalResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid loan status'
  })
  @ApiNotFoundResponse({
    description: 'Loan not found',
    schema: NotFoundResponseSchema
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: AuthErrorSchemas.invalidCredentials
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    schema: AuthErrorSchemas.insufficientPermissions
  })
  async rejectLoan(
    @Param('id') loanId: string,
    @Body() rejectDto: RejectLoanDto,
    @CurrentUser() admin: UserJWT
  ): Promise<LoanApprovalResponseDto> {
    return await this.loansService.rejectLoan(loanId, rejectDto, admin.id)
  }

  @Post(':id/disburse')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Disburse an approved loan',
    description:
      'Disburse cash for an approved loan and generate installments. SuperAdmin only.'
  })
  @ApiParam({
    name: 'id',
    description: 'Loan ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Loan disbursed successfully, installments generated',
    type: LoanApprovalResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Loan must be approved first'
  })
  @ApiNotFoundResponse({
    description: 'Loan not found',
    schema: NotFoundResponseSchema
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: AuthErrorSchemas.invalidCredentials
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    schema: AuthErrorSchemas.insufficientPermissions
  })
  async disburseLoan(
    @Param('id') loanId: string,
    @CurrentUser() admin: UserJWT
  ): Promise<LoanApprovalResponseDto> {
    return await this.loansService.disburseLoan(loanId, admin.id)
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  InternalServerErrorException,
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
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserRole } from '../common/constants'
import { UserJWT } from '../users/interface/users'

import { CreateExpenseDto } from './dto/create-expense.dto'
import {
  ExpenseResponseDto,
  ExpensesPaginatedResponseDto,
  ExpenseCategoryResponseDto
} from './dto/expense-response.dto'
import { ExpensesQueryDto } from './dto/expenses-query.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { ExpensesService } from './expenses.service'

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Unauthorized - Invalid or expired token'
})
@ApiForbiddenResponse({
  description: 'Forbidden - Insufficient permissions'
})
@ApiInternalServerErrorResponse({
  description: 'Internal server error'
})
export class ExpensesController {
  private readonly logger = new Logger(ExpensesController.name)

  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Create new expense',
    description:
      'Create a new expense record with category validation and automatic cashbook integration. Requires Administrator or SuperAdministrator role.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Expense created successfully',
    type: ExpenseResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation failed'
  })
  @ApiNotFoundResponse({
    description: 'Expense category not found'
  })
  async createExpense(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: UserJWT
  ): Promise<ExpenseResponseDto> {
    try {
      this.logger.log(`Creating expense for user ${user.id}`)
      return await this.expensesService.createExpense(createExpenseDto, user.id)
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error('Unexpected error creating expense:', error)
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred while creating expense',
        error: 'Internal Server Error'
      })
    }
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get expenses with filtering and pagination',
    description:
      'Retrieve expenses with optional filtering by category, date range, amount, and user. Supports pagination and sorting.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expenses retrieved successfully',
    type: ExpensesPaginatedResponseDto
  })
  async findAllExpenses(
    @Query() query: ExpensesQueryDto
  ): Promise<ExpensesPaginatedResponseDto> {
    try {
      this.logger.log(
        `Retrieving expenses with filters: ${JSON.stringify(query)}`
      )
      return await this.expensesService.findAllExpenses(query)
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error('Unexpected error retrieving expenses:', error)
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred while retrieving expenses',
        error: 'Internal Server Error'
      })
    }
  }

  @Get('categories')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get available expense categories',
    description:
      'Retrieve all available expense categories for use in expense creation and filtering.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense categories retrieved successfully',
    type: [ExpenseCategoryResponseDto]
  })
  async getExpenseCategories(): Promise<ExpenseCategoryResponseDto[]> {
    try {
      this.logger.log('Retrieving expense categories')
      return await this.expensesService.getAllCategories()
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error(
        'Unexpected error retrieving expense categories:',
        error
      )
      throw new InternalServerErrorException({
        statusCode: 500,
        message:
          'An unexpected error occurred while retrieving expense categories',
        error: 'Internal Server Error'
      })
    }
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get expense by ID',
    description:
      'Retrieve a single expense record by its ID with category information.'
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense retrieved successfully',
    type: ExpenseResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Expense not found'
  })
  async findExpenseById(@Param('id') id: string): Promise<ExpenseResponseDto> {
    try {
      this.logger.log(`Retrieving expense by ID: ${id}`)
      return await this.expensesService.findExpenseById(id)
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error('Unexpected error retrieving expense:', error)
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred while retrieving expense',
        error: 'Internal Server Error'
      })
    }
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Update expense',
    description:
      'Update an existing expense record. Changes to amount will affect related cashbook transactions.'
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expense updated successfully',
    type: ExpenseResponseDto
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation failed'
  })
  @ApiNotFoundResponse({
    description: 'Expense or expense category not found'
  })
  async updateExpense(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto
  ): Promise<ExpenseResponseDto> {
    try {
      this.logger.log(`Updating expense ${id}`)
      return await this.expensesService.updateExpense(id, updateExpenseDto)
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error('Unexpected error updating expense:', error)
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred while updating expense',
        error: 'Internal Server Error'
      })
    }
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Delete expense (SuperAdmin only)',
    description:
      'Delete an expense record. Only SuperAdministrators can delete expenses. Related cashbook transactions will be handled according to business rules.'
  })
  @ApiParam({
    name: 'id',
    description: 'Expense ID',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Expense deleted successfully'
  })
  @ApiNotFoundResponse({
    description: 'Expense not found'
  })
  async deleteExpense(@Param('id') id: string): Promise<void> {
    try {
      this.logger.log(`Deleting expense ${id}`)
      await this.expensesService.deleteExpense(id)
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      this.logger.error('Unexpected error deleting expense:', error)
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred while deleting expense',
        error: 'Internal Server Error'
      })
    }
  }
}

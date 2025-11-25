import {
  NotFoundException,
  BadRequestException,
  HttpStatus
} from '@nestjs/common'

export class ExpenseNotFoundError extends NotFoundException {
  constructor(expenseId: string) {
    super({
      message: `Expense with ID ${expenseId} not found`,
      error: 'EXPENSE_NOT_FOUND',
      statusCode: HttpStatus.NOT_FOUND
    })
  }
}

export class ExpenseCategoryNotFoundError extends NotFoundException {
  constructor(categoryId: string) {
    super({
      message: `Expense category with ID ${categoryId} not found`,
      error: 'EXPENSE_CATEGORY_NOT_FOUND',
      statusCode: HttpStatus.NOT_FOUND
    })
  }
}

export class InvalidExpenseAmountError extends BadRequestException {
  constructor(amount: number) {
    super({
      message: `Invalid expense amount: ${amount}. Amount must be a positive number`,
      error: 'INVALID_EXPENSE_AMOUNT',
      statusCode: HttpStatus.BAD_REQUEST
    })
  }
}

export class InsufficientFundsError extends BadRequestException {
  constructor(amount: number, balance: number, source: string) {
    super({
      message: `Insufficient funds from ${source}. Amount: ${amount}, Balance: ${balance}`,
      error: 'INSUFFICIENT_FUNDS',
      statusCode: HttpStatus.BAD_REQUEST
    })
  }
}

export class ExpenseValidationError extends BadRequestException {
  constructor(message: string) {
    super({
      message: `Expense validation failed: ${message}`,
      error: 'EXPENSE_VALIDATION_ERROR',
      statusCode: HttpStatus.BAD_REQUEST
    })
  }
}

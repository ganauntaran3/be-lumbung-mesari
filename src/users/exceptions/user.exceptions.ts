import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Custom exception for email notification failures
 * This is a non-critical error that should not fail the main operation
 */
export class EmailNotificationFailedException extends HttpException {
  constructor(email: string, action: string, originalError?: any) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Failed to send ${action} notification email to ${email}`,
        error: 'EmailNotificationFailed',
        details: originalError?.message || 'Unknown email service error'
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }
}

/**
 * Custom exception for user approval workflow failures
 */
export class UserApprovalFailedException extends HttpException {
  constructor(userId: string, action: string, reason?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Failed to ${action} user ${userId}`,
        error: 'UserApprovalFailed',
        details: reason
      },
      HttpStatus.BAD_REQUEST
    )
  }
}

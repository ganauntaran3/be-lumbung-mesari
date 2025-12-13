// Base error schema factory
export const createErrorResponseSchema = (
  statusCode: number,
  errorType: string,
  exampleMessage: string
) => ({
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: statusCode },
    message: { type: 'string', example: exampleMessage },
    error: { type: 'string', example: errorType }
  }
})

// Factory functions for specific error types
export const createUnauthorizedSchema = (message = 'Invalid credentials') =>
  createErrorResponseSchema(401, 'Unauthorized', message)

export const createBadRequestSchema = (message = 'Validation failed') =>
  createErrorResponseSchema(400, 'Bad Request', message)

export const createForbiddenSchema = (message = 'Access denied') =>
  createErrorResponseSchema(403, 'Forbidden', message)

export const createGoneRequestSchema = (
  message = 'Resource no longer exists'
) => createErrorResponseSchema(410, 'Gone', message)

export const createConflictSchema = (message = 'Resource already exists') =>
  createErrorResponseSchema(409, 'Conflict', message)

export const createNotFoundSchema = (message = 'Resource not found') =>
  createErrorResponseSchema(404, 'Not Found', message)

export const createInternalServerErrorSchema = (
  message = 'Internal server error occurred'
) => createErrorResponseSchema(500, 'Internal Server Error', message)

export const UnauthorizedResponseSchema = createUnauthorizedSchema()
export const BadRequestResponseSchema = createBadRequestSchema()
export const ConflictResponseSchema = createConflictSchema(
  'Email already exists'
)
export const NotFoundResponseSchema = createNotFoundSchema('Resource not found')
export const InternalServerErrorResponseSchema =
  createInternalServerErrorSchema()

// Specific OTP-related schemas
export const OtpBadRequestSchemas = {
  invalidOtp: createBadRequestSchema('Invalid OTP code'),
  expiredOtp: createGoneRequestSchema(
    'OTP has expired. Please request a new one.'
  ),
  alreadyVerified: createBadRequestSchema('OTP already verified'),
  userNotPending: createBadRequestSchema('User not in pending status'),
  sessionExpired: createGoneRequestSchema(
    'Your session has expired. Please login again to continue.'
  )
}

// Specific Token-related schemas
export const TokenErrorSchemas = {
  invalidToken: createUnauthorizedSchema('Invalid token'),
  expiredToken: createUnauthorizedSchema(
    'Token has expired. Please login again.'
  ),
  sessionExpired: createUnauthorizedSchema(
    'Your session has expired. Please login again to continue.'
  ),
  alreadyVerified: createBadRequestSchema('OTP already verified'),
  userNotPending: createBadRequestSchema('User not in pending status')
}

// Auth-related schemas
export const AuthErrorSchemas = {
  invalidCredentials: createUnauthorizedSchema('Invalid credentials'),
  emailExists: createConflictSchema('Email address is already registered'),
  usernameExists: createConflictSchema('Username is already taken'),
  userNotFound: createNotFoundSchema('User not found'),
  validationFailed: createBadRequestSchema('Validation failed'),
  insufficientPermissions: createForbiddenSchema(
    'User with role {role} does not have sufficient permissions'
  )
}

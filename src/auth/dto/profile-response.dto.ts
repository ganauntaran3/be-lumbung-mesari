export const UserProfileResponseSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      example: '123e4567-e89b-12d3-a456-426614174000',
      description: 'User ID'
    },
    email: {
      type: 'string',
      example: 'user@example.com',
      description: 'User email address'
    },
    fullname: {
      type: 'string',
      example: 'John Doe',
      description: 'User full name'
    },
    username: {
      type: 'string',
      example: 'johndoe',
      description: 'Username'
    },
    phoneNumber: {
      type: 'string',
      example: '081234567890',
      description: 'Phone number'
    },
    address: {
      type: 'string',
      example: 'Jl. Merdeka No. 123, Jakarta',
      description: 'User address'
    },
    status: {
      type: 'string',
      enum: ['waiting_deposit', 'pending', 'active', 'inactive', 'suspended'],
      example: 'active',
      description: 'User account status'
    },
    roleId: {
      type: 'string',
      example: 'member',
      description: 'User role ID'
    },
    otpVerified: {
      type: 'boolean',
      example: true,
      description: 'Whether OTP has been verified'
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      example: '2024-01-01T00:00:00.000Z',
      description: 'Account creation timestamp'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      example: '2024-01-01T00:00:00.000Z',
      description: 'Account last update timestamp'
    }
  }
}

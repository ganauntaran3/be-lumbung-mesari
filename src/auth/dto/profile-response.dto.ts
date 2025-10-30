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
    phone_number: {
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
    role_id: {
      type: 'string',
      example: 'member',
      description: 'User role ID'
    },
    role: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: 'member',
          description: 'Role ID'
        },
        name: {
          type: 'string',
          example: 'Member',
          description: 'Role name'
        }
      },
      description: 'User role details'
    },
    deposit_image_url: {
      type: 'string',
      nullable: true,
      example: 'https://example.com/deposits/image.jpg',
      description: 'URL of deposit proof image'
    },
    otp_verified: {
      type: 'boolean',
      example: true,
      description: 'Whether OTP has been verified'
    },
    created_at: {
      type: 'string',
      format: 'date-time',
      example: '2024-01-01T00:00:00.000Z',
      description: 'Account creation timestamp'
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      example: '2024-01-01T00:00:00.000Z',
      description: 'Account last update timestamp'
    }
  }
}

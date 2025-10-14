import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Req,
  HttpException,
  HttpStatus,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common'
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiTags,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,

} from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto'
import { RegisterDto, RegisterResponseDto } from './dto/register.dto'
import { VerifyOtpDto, VerifyOtpResponseDto } from './dto/verify-otp.dto'
import { ResendOtpDto, ResendOtpResponseDto } from './dto/resend-otp.dto'
import { JwtAuthGuard } from './guards/auth.guard'
import { UserRole } from './enums/role.enum'
import { CurrentUser } from './decorators/current-user.decorator'

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  @ApiOperation({ summary: 'User login with email or username' })
  @ApiResponse({
    status: 201,
    description: 'Successfully logged in',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/login' }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Identifier is required' },
        error: { type: 'string', example: 'Bad Request' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/login' }
      }
    }
  })
  @ApiBody({
    type: LoginRequestDto,
    description: 'Login credentials',
    examples: {
      'Login with email': {
        summary: 'Login using email address',
        value: {
          identifier: 'admin@lumbungmesari.com',
          password: 'admin123'
        }
      },
      'Login with username': {
        summary: 'Login using username',
        value: {
          identifier: 'admin',
          password: 'admin123'
        }
      }
    }
  })
  async login(@Body() loginDto: LoginRequestDto, @Req() req: any) {
    try {
      const result = await this.authService.login(loginDto);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Unexpected login error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred during login',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: req.url
      });
    }
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user (Step 1: Personal Information)',
    description: `Register a new cooperative member with personal information. This is the first step of a two-step registration process:
    
    **Step 1**: Submit personal information (this endpoint)
    - User provides email, password, fullname, username, phone_number, and address
    - System validates data and sends OTP to email
    - User status is set to 'pending' until OTP verification
    
    **Step 2**: Verify OTP using /auth/verify-otp endpoint
    - User verifies email with OTP code
    - Status changes to 'waiting_deposit'
    - User can then submit deposit proof (future enhancement)
    
    **Validation Rules:**
    - Email must be unique and valid format
    - Username must be unique, 3+ characters, alphanumeric only
    - Password must be 8+ characters with at least one uppercase letter
    - Phone number must be valid Indonesian format (08xxxxxxxxx or +628xxxxxxxxx)
    - Address must be at least 10 characters
    - Password confirmation must match password`
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully, OTP sent to email for verification',
    type: RegisterResponseDto,
    schema: {
      example: {
        user: {
          id: 'uuid-v4-string',
          email: 'user@example.com',
          fullname: 'John Doe',
          username: 'johndoe',
          status: 'pending'
        },
        message: 'Registration successful. Please check your email for OTP verification code.',
        otp_sent: true
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Password confirmation does not match' },
        error: { type: 'string', example: 'Bad Request' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/register' }
      }
    }
  })
  @ApiConflictResponse({
    description: 'Email or username already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Email already exists' },
        error: { type: 'string', example: 'Conflict' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/register' }
      }
    }
  })

  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error occurred' },
        error: { type: 'string', example: 'Internal Server Error' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/register' }
      }
    }
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data with personal information',
    examples: {
      'Valid Registration': {
        summary: 'Complete registration with all required fields',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePass123',
          passwordConfirmation: 'SecurePass123',
          fullname: 'John Doe',
          username: 'johndoe',
          phone_number: '081234567890',
          address: 'Jl. Merdeka No. 123, Jakarta Pusat, DKI Jakarta'
        }
      },
      'Alternative Phone Format': {
        summary: 'Registration with +62 phone format',
        value: {
          email: 'jane.smith@example.com',
          password: 'MyPassword123',
          passwordConfirmation: 'MyPassword123',
          fullname: 'Jane Smith',
          username: 'janesmith',
          phone_number: '+6281234567890',
          address: 'Jl. Sudirman No. 456, Bandung, Jawa Barat'
        }
      }
    }
  })
  async register(@Body() registerDto: RegisterDto, @Req() req: any) {
    try {
      const result = await this.authService.register(registerDto);

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof ConflictException) {
        throw error;
      }

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('email') && message.includes('exists')) {
          throw new ConflictException({
            statusCode: 409,
            message: 'Email address is already registered',
            error: 'Conflict',
            timestamp: new Date().toISOString(),
            path: req.url
          });
        }

        if (message.includes('username') && message.includes('exists')) {
          throw new ConflictException({
            statusCode: 409,
            message: 'Username is already taken',
            error: 'Conflict',
            timestamp: new Date().toISOString(),
            path: req.url
          });
        }


      }

      console.error('Unexpected registration error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred during registration. Please try again.',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: req.url
      });
    }
  }

  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP code (Step 2: Email Verification)',
    description: `Verify the OTP code sent to user's email during registration.`
  })
  @ApiResponse({
    status: 201,
    description: 'OTP verified successfully, user status updated to waiting_deposit',
    type: VerifyOtpResponseDto,
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'uuid-v4-string',
          email: 'user@example.com',
          fullname: 'John Doe',
          username: 'johndoe',
          status: 'waiting_deposit'
        },
        message: 'OTP verified successfully. Please submit your deposit proof to complete registration.'
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid OTP, expired OTP, or user not in correct status',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          examples: [
            'Invalid OTP code',
            'OTP has expired',
            'OTP already verified',
            'User not in pending status'
          ]
        },
        error: { type: 'string', example: 'Bad Request' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/verify-otp' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/verify-otp' }
      }
    }
  })
  @ApiBody({
    type: VerifyOtpDto,
    description: 'OTP verification data',
    examples: {
      'Valid OTP': {
        summary: 'Valid OTP verification request',
        value: {
          email: 'user@example.com',
          otp_code: '123456'
        }
      }
    }
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto, @Req() req: any) {
    try {

      const result = await this.authService.verifyOtp(
        verifyOtpDto.email,
        verifyOtpDto.otp_code,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestException ||
        error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('not found')) {
          throw new HttpException({
            statusCode: 404,
            message: 'User not found',
            error: 'Not Found',
            timestamp: new Date().toISOString(),
            path: req.url
          }, HttpStatus.NOT_FOUND);
        }
      }

      console.error('Unexpected OTP verification error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred during OTP verification',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: req.url
      });
    }
  }

  @Post('resend-otp')
  @ApiOperation({
    summary: 'Resend OTP code to email',
    description: `Resend OTP verification code to user's email address.
    
    ** Use Cases:**
      - User didn't receive the initial OTP email
    - OTP code has expired
    - User accidentally deleted the email

  ** Requirements:**
  - User must be in 'pending' status
  - OTP must not be already verified
  - Email must exist in the system`
  })
  @ApiResponse({
    status: 201,
    description: 'New OTP sent successfully to email',
    type: ResendOtpResponseDto,
    schema: {
      example: {
        message: 'New OTP has been sent to your email.',
        otp_sent: true
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'User not in pending status or OTP already verified',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          examples: [
            'User not in pending status',
            'OTP already verified'
          ]
        },
        error: { type: 'string', example: 'Bad Request' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/resend-otp' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/resend-otp' }
      }
    }
  })
  @ApiBody({
    type: ResendOtpDto,
    description: 'Email address to resend OTP to',
    examples: {
      'Resend OTP': {
        summary: 'Request to resend OTP to email',
        value: {
          email: 'user@example.com'
        }
      }
    }
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto, @Req() req: any) {
    try {
      const ipAddress = req.ip ||
        req.connection?.remoteAddress ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await this.authService.resendOtp(
        resendOtpDto.email,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestException ||
        error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('not found')) {
          throw new HttpException({
            statusCode: 404,
            message: 'User not found',
            error: 'Not Found',
            timestamp: new Date().toISOString(),
            path: req.url
          }, HttpStatus.NOT_FOUND);
        }
      }

      console.error('Unexpected OTP resend error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred while resending OTP',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: req.url
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: `Generate new access and refresh tokens using existing valid token.
    
    ** Requirements:**
  - Valid JWT token in Authorization header
  - Token must not be expired

  ** Security:**
  - New tokens are generated with updated expiration times
    - Old tokens remain valid until their natural expiration`
  })
  @ApiResponse({
    status: 201,
    description: 'Token refreshed successfully',
    type: LoginResponseDto,
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        path: { type: 'string', example: '/api/auth/refresh' }
      }
    }
  })
  async refresh(@Request() req: { user: any }, @Req() request: any) {
    try {
      const result = await this.authService.refreshToken(req.user);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Unexpected token refresh error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred during token refresh',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: `Retrieve the authenticated user's profile information.

  ** Returns:**
    - User ID, email, fullname, username
      - User status and role information
        - Account creation and update timestamps

          ** Security:**
            - Requires valid JWT token
              - Returns only non - sensitive user data
                - Password and other sensitive fields are excluded`
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid-v4-string' },
        email: { type: 'string', example: 'user@example.com' },
        fullname: { type: 'string', example: 'John Doe' },
        username: { type: 'string', example: 'johndoe' },
        phone_number: { type: 'string', example: '081234567890' },
        address: { type: 'string', example: 'Jl. Merdeka No. 123, Jakarta' },
        status: { type: 'string', example: 'active' },
        role: { type: 'string', example: 'member' },
        created_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        updated_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Unauthorized' },
      }
    }
  })
  getProfile(@CurrentUser() user: any, @Req() req: any) {
    try {
      const { password, otp_code, otp_expires_at, ...safeUserData } = user;

      return {
        ...safeUserData,
      };
    } catch (error) {
      console.error('Unexpected profile retrieval error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred while retrieving profile',
        error: 'Internal Server Error',
      });
    }
  }
}

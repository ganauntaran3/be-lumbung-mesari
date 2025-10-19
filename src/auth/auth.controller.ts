import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
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
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiGoneResponse,
} from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto'
import { RegisterDto, RegisterResponseDto } from './dto/register.dto'
import { VerifyOtpDto, VerifyOtpResponseDto } from './dto/verify-otp.dto'
import { ResendOtpResponseDto } from './dto/resend-otp.dto'
import {
  AuthErrorSchemas,
  OtpBadRequestSchemas,
  TokenErrorSchemas,
  InternalServerErrorResponseSchema
} from '../common/schema/error-schema'
import { JwtAuthGuard } from './guards/auth.guard'

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  @ApiOperation({
    summary: 'User login with email or username',
    description: `Authenticate user and return access tokens. 
    
**Special Behavior for Pending Users:**
- If user status is 'pending' (not verified OTP), a new OTP will be automatically generated and sent to their email
- This allows users to re-enter the verification flow if their previous token expired
- Response will include otp_sent: true and a message indicating OTP was sent`
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully logged in',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: AuthErrorSchemas.invalidCredentials
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    schema: AuthErrorSchemas.validationFailed
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
  async login(@Body() loginDto: LoginRequestDto) {
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
        error: 'Internal Server Error'
      });
    }
  }

  @Post('register')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully, OTP sent to email for verification',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or invalid input data',
    schema: AuthErrorSchemas.validationFailed
  })
  @ApiConflictResponse({
    description: 'Email or username already exists',
    schema: AuthErrorSchemas.emailExists
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    schema: InternalServerErrorResponseSchema
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
  async register(@Body() registerDto: RegisterDto) {
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
            error: 'Conflict'
          });
        }

        if (message.includes('username') && message.includes('exists')) {
          throw new ConflictException({
            statusCode: 409,
            message: 'Username is already taken',
            error: 'Conflict'
          });
        }
      }

      console.error('Unexpected registration error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred during registration. Please try again.',
        error: 'Internal Server Error'
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP code (Step 2: Email Verification)',
    description: `Verify the OTP code sent to user's email during registration. Requires authentication token from registration.`
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP verified successfully, user status updated to waiting_deposit',
    type: VerifyOtpResponseDto,
  })
  @ApiGoneResponse({
    description: 'OTP has expired, need to resend OTP',
    schema: OtpBadRequestSchemas.expiredOtp
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid token',
    schema: TokenErrorSchemas.invalidToken
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Expired token (relog needed)',
    schema: TokenErrorSchemas.expiredToken
  })
  @ApiBadRequestResponse({
    description: 'Invalid OTP code',
    schema: OtpBadRequestSchemas.invalidOtp
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    schema: AuthErrorSchemas.userNotFound
  })
  @ApiBody({
    description: 'OTP verification data',
    type: VerifyOtpDto,
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto, @Request() req: { user: any }) {
    try {
      const result = await this.authService.verifyOtp(
        req.user.id,
        verifyOtpDto.otpCode,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestException ||
        error instanceof HttpException) {
        throw error;
      }

      console.error('Unexpected OTP verification error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred during OTP verification',
        error: 'Internal Server Error'
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-otp')
  @ApiOperation({
    summary: 'Resend OTP code to email',
    description: `Resend OTP verification code to user's email address. Requires authentication token from registration.`
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New OTP sent successfully to email',
    type: ResendOtpResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: TokenErrorSchemas.sessionExpired
  })
  @ApiBadRequestResponse({
    description: 'User not in pending status or OTP already verified',
    schema: OtpBadRequestSchemas.userNotPending
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    schema: AuthErrorSchemas.userNotFound
  })
  async resendOtp(@Request() req: { user: any }) {
    try {

      const result = await this.authService.resendOtp(
        req.user.id,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestException ||
        error instanceof HttpException) {
        throw error;
      }

      console.error('Unexpected OTP resend error:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'An unexpected error occurred while resending OTP',
        error: 'Internal Server Error'
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
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    type: LoginResponseDto,
    schema: {
      example: {
        token: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or expired token',
    schema: AuthErrorSchemas.invalidCredentials
  })
  async refresh(@Request() req: { user: any }) {
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
        error: 'Internal Server Error'
      });
    }
  }
}

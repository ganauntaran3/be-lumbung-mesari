import { Body, Controller, Post, UseGuards, Request, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/auth.guard'
import { Roles } from './decorators/roles.decorator'
import { RolesGuard } from './guards/roles.guard'
import { UserRole } from './enums/role.enum'
import { CurrentUser } from './decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  @ApiOperation({ summary: 'User login with email or username' })
  @ApiResponse({
    status: 201,
    description: 'Successfully logged in',
    type: LoginResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({
    type: LoginRequestDto,
    examples: {
      'Login with email': {
        value: {
          identifier: 'admin@lumbungmesari.com',
          password: 'admin123'
        }
      },
      'Login with username': {
        value: {
          identifier: 'admin',
          password: 'admin123'
        }
      }
    }
  })
  async login(@Body() loginDto: LoginRequestDto) {
    return this.authService.login(loginDto)
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: LoginResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto)
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 201,
    description: 'Token refreshed',
    type: LoginResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refresh(@Request() req: { user: any }) {
    return this.authService.refreshToken(req.user)
  }
}

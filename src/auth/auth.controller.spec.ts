import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { LoginRequestDto } from './dto/login.dto'

describe('AuthController', () => {
  let controller: AuthController
  let authService: AuthService

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService
        }
      ]
    }).compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get<AuthService>(AuthService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('login', () => {
    const validLoginDto: LoginRequestDto = {
      identifier: 'admin@lumbungmesari.com',
      password: 'admin123'
    }

    const expectedTokens = {
      access_token: 'mock.jwt.token',
      refresh_token: 'mock.refresh.token'
    }

    it('should return tokens when login is successful', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(expectedTokens)

      // Act
      const result = await controller.login(validLoginDto)

      // Assert
      expect(authService.login).toHaveBeenCalledWith(validLoginDto)
      expect(authService.login).toHaveBeenCalledTimes(1)
      expect(result).toEqual(expectedTokens)
    })

    it('should throw UnauthorizedException when login fails', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      )

      // Act & Assert
      await expect(controller.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException
      )
      expect(authService.login).toHaveBeenCalledWith(validLoginDto)
      expect(authService.login).toHaveBeenCalledTimes(1)
    })

    it('should handle login with username identifier', async () => {
      // Arrange
      const usernameLoginDto: LoginRequestDto = {
        identifier: 'admin',
        password: 'admin123'
      }
      mockAuthService.login.mockResolvedValue(expectedTokens)

      // Act
      const result = await controller.login(usernameLoginDto)

      // Assert
      expect(authService.login).toHaveBeenCalledWith(usernameLoginDto)
      expect(result).toEqual(expectedTokens)
    })
  })
})

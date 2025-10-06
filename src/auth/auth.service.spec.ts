import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { LoginRequestDto } from './dto/login.dto'
import { EmailHelperService } from '../notifications/email/email-helper.service'


import { RateLimitService } from './services/rate-limit.service'
import { OtpService } from './services/otp.service'

jest.mock('bcrypt')
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('AuthService', () => {
  let service: AuthService
  let usersService: UsersService
  let jwtService: JwtService

  const mockUsersService = {
    findByIdentifierWithRole: jest.fn(),
    findByEmailWithRole: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn()
  }

  const mockJwtService = {
    sign: jest.fn()
  }

  const mockEmailHelperService = {
    sendEmail: jest.fn(),
    sendBulkEmail: jest.fn()
  }





  const mockRateLimitService = {
    checkRegistrationLimit: jest.fn(),
    recordSuccessfulRegistration: jest.fn()
  }

  const mockOtpService = {
    generateOtp: jest.fn(),
    getOtpExpirationTime: jest.fn(),
    isValidOtpFormat: jest.fn(),
    isOtpExpired: jest.fn()
  }

  const mockUser = {
    id: 'user-123',
    email: 'admin@lumbungmesari.com',
    username: 'admin',
    password: '$2b$10$hashedPassword',
    role: 'administrator',
    fullname: 'Admin User',
    phone_number: '+1234567890',
    address: 'Admin Address',
    status: 'active'
  }

  const mockUserWithoutPassword = {
    id: 'user-123',
    email: 'admin@lumbungmesari.com',
    username: 'admin',
    role: 'administrator',
    fullname: 'Admin User',
    phone_number: '+1234567890',
    address: 'Admin Address',
    status: 'active'
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        },
        {
          provide: EmailHelperService,
          useValue: mockEmailHelperService
        },


        {
          provide: RateLimitService,
          useValue: mockRateLimitService
        },
        {
          provide: OtpService,
          useValue: mockOtpService
        }
      ]
    }).compile()

    service = module.get<AuthService>(AuthService)
    usersService = module.get<UsersService>(UsersService)
    jwtService = module.get<JwtService>(JwtService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      mockUsersService.findByIdentifierWithRole.mockResolvedValue(mockUser)
      mockedBcrypt.compare.mockResolvedValue(true as never)

      const result = await service.validateUser(
        'admin@lumbungmesari.com',
        'admin123'
      )

      expect(usersService.findByIdentifierWithRole).toHaveBeenCalledWith(
        'admin@lumbungmesari.com'
      )
      expect(bcrypt.compare).toHaveBeenCalledWith('admin123', mockUser.password)
      expect(result).toEqual(mockUserWithoutPassword)
    })

    it('should return null when user is not found', async () => {
      mockUsersService.findByIdentifierWithRole.mockResolvedValue(null)

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password'
      )

      expect(usersService.findByIdentifierWithRole).toHaveBeenCalledWith(
        'nonexistent@example.com'
      )
      expect(bcrypt.compare).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should return null when password is invalid', async () => {
      mockUsersService.findByIdentifierWithRole.mockResolvedValue(mockUser)
      mockedBcrypt.compare.mockResolvedValue(false as never)

      const result = await service.validateUser(
        'admin@lumbungmesari.com',
        'wrongpassword'
      )

      expect(usersService.findByIdentifierWithRole).toHaveBeenCalledWith(
        'admin@lumbungmesari.com'
      )
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongpassword',
        mockUser.password
      )
      expect(result).toBeNull()
    })

    it('should work with username identifier', async () => {
      mockUsersService.findByIdentifierWithRole.mockResolvedValue(mockUser)
      mockedBcrypt.compare.mockResolvedValue(true as never)

      const result = await service.validateUser('admin', 'admin123')

      expect(usersService.findByIdentifierWithRole).toHaveBeenCalledWith(
        'admin'
      )
      expect(result).toEqual(mockUserWithoutPassword)
    })
  })

  describe('login', () => {
    const loginDto: LoginRequestDto = {
      identifier: 'admin@lumbungmesari.com',
      password: 'admin123'
    }

    const expectedTokens = {
      access_token: 'mock.access.token',
      refresh_token: 'mock.refresh.token'
    }

    it('should return tokens when credentials are valid', async () => {
      jest
        .spyOn(service, 'validateUser')
        .mockResolvedValue(mockUserWithoutPassword)
      mockJwtService.sign
        .mockReturnValueOnce('mock.access.token')
        .mockReturnValueOnce('mock.refresh.token')

      const result = await service.login(loginDto)

      expect(service.validateUser).toHaveBeenCalledWith(
        loginDto.identifier,
        loginDto.password
      )
      expect(jwtService.sign).toHaveBeenCalledTimes(2)
      expect(jwtService.sign).toHaveBeenNthCalledWith(1, {
        sub: mockUserWithoutPassword.id,
        email: mockUserWithoutPassword.email,
        role: mockUserWithoutPassword.role
      })
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          sub: mockUserWithoutPassword.id,
          email: mockUserWithoutPassword.email,
          role: mockUserWithoutPassword.role
        },
        { expiresIn: '1d' }
      )
      expect(result).toEqual(expectedTokens)
    })

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null)

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      )
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials'
      )
      expect(service.validateUser).toHaveBeenCalledWith(
        loginDto.identifier,
        loginDto.password
      )
      expect(jwtService.sign).not.toHaveBeenCalled()
    })

    it('should handle username login', async () => {
      const usernameLoginDto: LoginRequestDto = {
        identifier: 'admin',
        password: 'admin123'
      }
      jest
        .spyOn(service, 'validateUser')
        .mockResolvedValue(mockUserWithoutPassword)
      mockJwtService.sign
        .mockReturnValueOnce('mock.access.token')
        .mockReturnValueOnce('mock.refresh.token')

      const result = await service.login(usernameLoginDto)

      expect(service.validateUser).toHaveBeenCalledWith('admin', 'admin123')
      expect(result).toEqual(expectedTokens)
    })
  })

  describe('generateTokens', () => {
    it('should generate access and refresh tokens with correct payload', () => {
      mockJwtService.sign
        .mockReturnValueOnce('mock.access.token')
        .mockReturnValueOnce('mock.refresh.token')

      const result = service['generateTokens'](mockUserWithoutPassword)

      expect(jwtService.sign).toHaveBeenCalledTimes(2)
      expect(jwtService.sign).toHaveBeenNthCalledWith(1, {
        sub: mockUserWithoutPassword.id,
        email: mockUserWithoutPassword.email,
        role: mockUserWithoutPassword.role
      })
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          sub: mockUserWithoutPassword.id,
          email: mockUserWithoutPassword.email,
          role: mockUserWithoutPassword.role
        },
        { expiresIn: '1d' }
      )
      expect(result).toEqual({
        access_token: 'mock.access.token',
        refresh_token: 'mock.refresh.token'
      })
    })

    it('should default to member role when user role is undefined', () => {
      const userWithoutRole = { ...mockUserWithoutPassword, role: undefined }
      mockJwtService.sign
        .mockReturnValueOnce('mock.access.token')
        .mockReturnValueOnce('mock.refresh.token')

      service['generateTokens'](userWithoutRole)

      expect(jwtService.sign).toHaveBeenNthCalledWith(1, {
        sub: userWithoutRole.id,
        email: userWithoutRole.email,
        role: 'member'
      })
    })
  })
})

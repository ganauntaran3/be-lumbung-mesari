import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'

describe('UsersService', () => {
  let service: UsersService
  let repository: UsersRepository

  const mockUsersRepository = {
    findAll: jest.fn(),
    create: jest.fn(),
    findByEmail: jest.fn(),
    findByEmailWithRole: jest.fn(),
    findByIdentifierWithRole: jest.fn()
  }

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    fullname: 'Test User',
    password: 'hashedPassword',
    phone_number: '+1234567890',
    address: 'Test Address',
    status: 'active' as const,
    role_id: 'member',
    deposit_image_url: ''
  }

  const mockUserWithRole = {
    ...mockUser,
    role: 'member'
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository
        }
      ]
    }).compile()

    service = module.get<UsersService>(UsersService)
    repository = module.get<UsersRepository>(UsersRepository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const expectedUsers = [mockUser]
      mockUsersRepository.findAll.mockResolvedValue(expectedUsers)

      const result = await service.findAll()

      expect(repository.findAll).toHaveBeenCalledTimes(1)
      expect(result).toEqual(expectedUsers)
    })
  })

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser)

      const result = await service.findByEmail('test@example.com')

      expect(repository.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(result).toEqual(mockUser)
    })
  })

  describe('findByEmailWithRole', () => {
    it('should return user with role when found by email', async () => {
      mockUsersRepository.findByEmailWithRole.mockResolvedValue(
        mockUserWithRole
      )

      const result = await service.findByEmailWithRole('test@example.com')

      expect(repository.findByEmailWithRole).toHaveBeenCalledWith(
        'test@example.com'
      )
      expect(result).toEqual(mockUserWithRole)
    })
  })

  describe('findByIdentifierWithRole', () => {
    it('should return user with role when found by identifier', async () => {
      mockUsersRepository.findByIdentifierWithRole.mockResolvedValue(
        mockUserWithRole
      )

      const result = await service.findByIdentifierWithRole('test@example.com')

      expect(repository.findByIdentifierWithRole).toHaveBeenCalledWith(
        'test@example.com'
      )
      expect(result).toEqual(mockUserWithRole)
    })
  })

  describe('create', () => {
    const createUserDto = {
      email: 'new@example.com',
      username: 'newuser',
      fullname: 'New User',
      password: 'hashedPassword',
      phone_number: '+1234567890',
      address: 'New Address',
      status: 'active' as const,
      role_id: 'member',
      deposit_image_url: ''
    }

    it('should create and return a new user when email does not exist', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null)
      const expectedUser = { ...mockUser, ...createUserDto, id: 'new-user-id' }
      mockUsersRepository.create.mockResolvedValue(expectedUser)

      const result = await service.create(createUserDto as any)

      expect(repository.findByEmail).toHaveBeenCalledWith(createUserDto.email)
      expect(repository.create).toHaveBeenCalledWith(createUserDto)
      expect(result).toEqual(expectedUser)
    })

    it('should throw ConflictException when email already exists', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser)

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException
      )
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Email already exists'
      )
      expect(repository.findByEmail).toHaveBeenCalledWith(createUserDto.email)
      expect(repository.create).not.toHaveBeenCalled()
    })
  })
})

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
    findByIdentifierWithRole: jest.fn(),
    findAllWithRoles: jest.fn(),
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

  describe('findAllWithPagination', () => {
    const mockPaginatedResponse = {
      data: [
        {
          id: '1',
          email: 'user1@example.com',
          fullname: 'User One',
          username: 'user1',
          phone_number: '123456789',
          address: 'Address 1',
          status: 'active',
          role_id: 'role1',
          created_at: new Date(),
          updated_at: new Date(),
          role_name: 'member',
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        totalData: 1,
        totalPage: 1,
        next: false,
        prev: false,
      },
    }

    const expectedServiceResponse = {
      data: [
        {
          id: '1',
          email: 'user1@example.com',
          fullname: 'User One',
          username: 'user1',
          phone_number: '123456789',
          address: 'Address 1',
          status: 'active',
          role_id: 'role1',
          created_at: mockPaginatedResponse.data[0].created_at,
          updated_at: mockPaginatedResponse.data[0].updated_at,
          role_name: 'member',
        },
      ],
      page: 1,
      limit: 10,
      totalData: 1,
      totalPage: 1,
      next: false,
      prev: false,
    }

    it('should return flattened paginated users with default options', async () => {
      mockUsersRepository.findAllWithRoles.mockResolvedValue(mockPaginatedResponse)

      const result = await service.findAllWithPagination()

      expect(repository.findAllWithRoles).toHaveBeenCalledWith({})
      expect(result).toEqual(expectedServiceResponse)
    })

    it('should return flattened paginated users with custom options', async () => {
      const options = {
        page: 2,
        limit: 5,
        sortBy: 'email',
        sortOrder: 'asc' as const,
        role: 'admin',
      }

      const customMockResponse = {
        ...mockPaginatedResponse,
        pagination: {
          page: 2,
          limit: 5,
          totalData: 15,
          totalPage: 3,
          next: true,
          prev: true,
        },
      }

      const expectedCustomResponse = {
        ...expectedServiceResponse,
        page: 2,
        limit: 5,
        totalData: 15,
        totalPage: 3,
        next: true,
        prev: true,
      }

      mockUsersRepository.findAllWithRoles.mockResolvedValue(customMockResponse)

      const result = await service.findAllWithPagination(options)

      expect(repository.findAllWithRoles).toHaveBeenCalledWith(options)
      expect(result).toEqual(expectedCustomResponse)
    })

    it('should handle empty results', async () => {
      const emptyMockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          totalData: 0,
          totalPage: 0,
          next: false,
          prev: false,
        },
      }

      const expectedEmptyResponse = {
        data: [],
        page: 1,
        limit: 10,
        totalData: 0,
        totalPage: 0,
        next: false,
        prev: false,
      }

      mockUsersRepository.findAllWithRoles.mockResolvedValue(emptyMockResponse)

      const result = await service.findAllWithPagination()

      expect(result).toEqual(expectedEmptyResponse)
    })

    it('should pass role filter to repository', async () => {
      const options = { role: 'member' }

      mockUsersRepository.findAllWithRoles.mockResolvedValue(mockPaginatedResponse)

      await service.findAllWithPagination(options)

      expect(repository.findAllWithRoles).toHaveBeenCalledWith(options)
    })
  })
})

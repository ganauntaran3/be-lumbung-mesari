import { Test, TestingModule } from '@nestjs/testing'

import { DatabaseService } from '../database/database.service'
import { PaginationOptions } from '../database/interfaces/pagination.interface'
import { User } from '../database/types/users'

import { UsersRepository } from './users.repository'

describe('UsersRepository', () => {
  let repository: UsersRepository
  let databaseService: DatabaseService
  let mockKnex: any

  beforeEach(async () => {
    // Mock Knex query builder
    mockKnex = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      count: jest.fn(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis()
    }

    // Mock database service
    const mockDatabaseService = {
      getKnex: jest.fn().mockReturnValue(() => mockKnex)
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService
        }
      ]
    }).compile()

    repository = module.get<UsersRepository>(UsersRepository)
    databaseService = module.get<DatabaseService>(DatabaseService)

    // Mock the knex function call
    repository['knex'] = jest.fn().mockReturnValue(mockKnex)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        fullname: 'Test User',
        username: 'testuser'
      }

      mockKnex.first.mockResolvedValue(mockUser)

      const result = await repository.findByEmail('test@example.com')

      expect(result).toEqual(mockUser)
      expect(mockKnex.where).toHaveBeenCalledWith('email', 'test@example.com')
      expect(mockKnex.first).toHaveBeenCalled()
    })

    it('should return undefined if user not found', async () => {
      mockKnex.first.mockResolvedValue(undefined)

      const result = await repository.findByEmail('nonexistent@example.com')

      expect(result).toBeUndefined()
    })
  })

  describe('findByEmailWithRole', () => {
    it('should find user with role by email', async () => {
      const mockUserWithRole = {
        id: '1',
        email: 'test@example.com',
        fullname: 'Test User',
        username: 'testuser',
        role: 'member'
      }

      mockKnex.first.mockResolvedValue(mockUserWithRole)

      const result = await repository.findByEmailWithRole('test@example.com')

      expect(result).toEqual(mockUserWithRole)
      expect(mockKnex.join).toHaveBeenCalledWith(
        'roles',
        'roles.id',
        'users.role_id'
      )
      expect(mockKnex.where).toHaveBeenCalledWith(
        'users.email',
        'test@example.com'
      )
    })
  })

  describe('findByIdentifierWithRole', () => {
    it('should find user by email or username', async () => {
      const mockUserWithRole = {
        id: '1',
        email: 'test@example.com',
        fullname: 'Test User',
        username: 'testuser',
        role: 'member'
      }

      mockKnex.first.mockResolvedValue(mockUserWithRole)

      const result =
        await repository.findByIdentifierWithRole('test@example.com')

      expect(result).toEqual(mockUserWithRole)
      expect(mockKnex.where).toHaveBeenCalledWith(
        'users.email',
        'test@example.com'
      )
      expect(mockKnex.orWhere).toHaveBeenCalledWith(
        'users.username',
        'test@example.com'
      )
    })
  })

  describe('findAllWithRoles', () => {
    const mockUsersWithRoles = [
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
        role_name: 'member'
      },
      {
        id: '2',
        email: 'user2@example.com',
        fullname: 'User Two',
        username: 'user2',
        phone_number: '987654321',
        address: 'Address 2',
        status: 'active',
        role_id: 'role1',
        created_at: new Date(),
        updated_at: new Date(),
        role_name: 'member'
      }
    ]

    it('should return paginated users with roles using default options', async () => {
      mockKnex.count.mockResolvedValue([{ count: '10' }])
      mockKnex.orderBy.mockResolvedValue(mockUsersWithRoles)

      const result = await repository.findAllWithRoles()

      expect(result).toEqual({
        data: mockUsersWithRoles,
        pagination: {
          page: 1,
          limit: 10,
          totalData: 10,
          totalPage: 1,
          next: false,
          prev: false
        }
      })

      expect(mockKnex.join).toHaveBeenCalledWith(
        'roles',
        'roles.id',
        'users.role_id'
      )
      expect(mockKnex.count).toHaveBeenCalledWith('users.id as count')
      expect(mockKnex.orderBy).toHaveBeenCalledWith('users.created_at', 'desc')
    })

    it('should return paginated users with custom pagination options', async () => {
      const options: PaginationOptions = {
        page: 2,
        limit: 5,
        sortBy: 'email',
        sortOrder: 'asc'
      }

      mockKnex.count.mockResolvedValue([{ count: '15' }])
      mockKnex.orderBy.mockResolvedValue(mockUsersWithRoles)

      const result = await repository.findAllWithRoles(options)

      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        totalData: 15,
        totalPage: 3,
        next: true,
        prev: true
      })

      expect(mockKnex.limit).toHaveBeenCalledWith(5)
      expect(mockKnex.offset).toHaveBeenCalledWith(5) // (page - 1) * limit
      expect(mockKnex.orderBy).toHaveBeenCalledWith('users.email', 'asc')
    })

    it('should filter by role when role is provided', async () => {
      const options = { role: 'admin' }

      mockKnex.count.mockResolvedValue([{ count: '5' }])
      mockKnex.orderBy.mockResolvedValue(mockUsersWithRoles)

      await repository.findAllWithRoles(options)

      // Should be called twice - once for count query, once for data query
      expect(mockKnex.where).toHaveBeenCalledWith('roles.id', 'admin')
      expect(mockKnex.where).toHaveBeenCalledTimes(2)
    })

    it('should handle table prefix in sortBy', async () => {
      const options: PaginationOptions = {
        sortBy: 'roles.name',
        sortOrder: 'asc'
      }

      mockKnex.count.mockResolvedValue([{ count: '10' }])
      mockKnex.orderBy.mockResolvedValue(mockUsersWithRoles)

      await repository.findAllWithRoles(options)

      // Should use the provided table prefix as-is
      expect(mockKnex.orderBy).toHaveBeenCalledWith('roles.name', 'asc')
    })

    it('should add table prefix when sortBy has no prefix', async () => {
      const options: PaginationOptions = {
        sortBy: 'fullname',
        sortOrder: 'asc'
      }

      mockKnex.count.mockResolvedValue([{ count: '10' }])
      mockKnex.orderBy.mockResolvedValue(mockUsersWithRoles)

      await repository.findAllWithRoles(options)

      // Should add users. prefix
      expect(mockKnex.orderBy).toHaveBeenCalledWith('users.fullname', 'asc')
    })

    it('should handle empty results', async () => {
      mockKnex.count.mockResolvedValue([{ count: '0' }])
      mockKnex.orderBy.mockResolvedValue([])

      const result = await repository.findAllWithRoles()

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          totalData: 0,
          totalPage: 0,
          next: false,
          prev: false
        }
      })
    })
  })

  describe('findAllWithRolesLegacy', () => {
    it('should return legacy format for backward compatibility', async () => {
      const mockUsersWithRoles = [
        {
          id: '1',
          email: 'user1@example.com',
          fullname: 'User One',
          username: 'user1',
          role_name: 'member'
        }
      ]

      mockKnex.count.mockResolvedValue([{ count: '10' }])
      mockKnex.orderBy.mockResolvedValue(mockUsersWithRoles)

      const result = await repository.findAllWithRolesLegacy(1, 10, 'member')

      expect(result).toEqual({
        data: mockUsersWithRoles,
        total: 10,
        page: 1,
        limit: 10,
        next: false,
        prev: false
      })
    })
  })

  describe('createUser', () => {
    it('should create a new user', async () => {
      const newUserData = {
        email: 'new@example.com',
        fullname: 'New User',
        username: 'newuser',
        password: 'hashedpassword',
        phone_number: '123456789',
        address: 'New Address',
        status: 'pending',
        role_id: 'role1'
      }

      const createdUser = {
        id: '1',
        ...newUserData,
        created_at: new Date(),
        updated_at: new Date()
      }

      mockKnex.returning.mockResolvedValue([createdUser])

      const result = await repository.createUser(newUserData)

      expect(result).toEqual(createdUser)
      expect(mockKnex.insert).toHaveBeenCalledWith(newUserData)
    })
  })

  describe('updateUser', () => {
    it('should update a user by ID', async () => {
      const updateData = { fullname: 'Updated Name' }
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        fullname: 'Updated Name',
        username: 'testuser',
        updated_at: new Date()
      }

      mockKnex.returning.mockResolvedValue([updatedUser])

      const result = await repository.updateUser('1', updateData)

      expect(result).toEqual(updatedUser)
      expect(mockKnex.where).toHaveBeenCalledWith('id', '1')
      expect(mockKnex.update).toHaveBeenCalledWith(updateData)
    })
  })

  describe('updateStatus', () => {
    it('should update user status', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        fullname: 'Test User',
        username: 'testuser',
        status: 'active',
        updated_at: new Date()
      }

      mockKnex.returning.mockResolvedValue([updatedUser])

      const result = await repository.updateStatus('1', 'active')

      expect(result).toEqual(updatedUser)
      expect(mockKnex.where).toHaveBeenCalledWith('id', '1')
      expect(mockKnex.update).toHaveBeenCalledWith({ status: 'active' })
    })
  })
})

import { Test, TestingModule } from '@nestjs/testing'

import { BaseRepository } from './base.repository'
import { DatabaseService } from './database.service'
import { PaginationOptions } from './interfaces/pagination.interface'

// Mock entity for testing
interface TestEntity {
  id: string
  name: string
  created_at: Date
  updated_at: Date
}

// Concrete implementation for testing
class TestRepository extends BaseRepository<TestEntity> {
  constructor(databaseService: DatabaseService) {
    super(databaseService, 'test_table')
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository
  let databaseService: DatabaseService
  let mockKnex: any

  beforeEach(async () => {
    // Mock Knex query builder
    mockKnex = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
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
        {
          provide: DatabaseService,
          useValue: mockDatabaseService
        }
      ]
    }).compile()

    databaseService = module.get<DatabaseService>(DatabaseService)
    repository = new TestRepository(databaseService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return all records', async () => {
      const mockData = [
        {
          id: '1',
          name: 'Test 1',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '2',
          name: 'Test 2',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]

      mockKnex.select.mockResolvedValue(mockData)

      const result = await repository.findAll()

      expect(result).toEqual(mockData)
      expect(mockKnex.select).toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('should return a record by ID', async () => {
      const mockData = {
        id: '1',
        name: 'Test 1',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockKnex.first.mockResolvedValue(mockData)

      const result = await repository.findById('1')

      expect(result).toEqual(mockData)
      expect(mockKnex.where).toHaveBeenCalledWith('id', '1')
      expect(mockKnex.first).toHaveBeenCalled()
    })

    it('should return undefined if record not found', async () => {
      mockKnex.first.mockResolvedValue(undefined)

      const result = await repository.findById('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  describe('create', () => {
    it('should create a new record', async () => {
      const newData = { name: 'New Test' }
      const createdData = {
        id: '1',
        name: 'New Test',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockKnex.returning.mockResolvedValue([createdData])

      const result = await repository.create(newData)

      expect(result).toEqual(createdData)
      expect(mockKnex.insert).toHaveBeenCalledWith(newData)
      expect(mockKnex.returning).toHaveBeenCalledWith('*')
    })
  })

  describe('updateById', () => {
    it('should update a record by ID', async () => {
      const updateData = { name: 'Updated Test' }
      const updatedData = {
        id: '1',
        name: 'Updated Test',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockKnex.returning.mockResolvedValue([updatedData])

      const result = await repository.updateById('1', updateData)

      expect(result).toEqual(updatedData)
      expect(mockKnex.where).toHaveBeenCalledWith('id', '1')
      expect(mockKnex.update).toHaveBeenCalledWith(updateData)
      expect(mockKnex.returning).toHaveBeenCalledWith('*')
    })
  })

  describe('deleteById', () => {
    it('should delete a record by ID', async () => {
      const deletedData = {
        id: '1',
        name: 'Deleted Test',
        created_at: new Date(),
        updated_at: new Date()
      }

      mockKnex.returning.mockResolvedValue([deletedData])

      const result = await repository.deleteById('1')

      expect(result).toEqual(deletedData)
      expect(mockKnex.where).toHaveBeenCalledWith('id', '1')
      expect(mockKnex.del).toHaveBeenCalled()
      expect(mockKnex.returning).toHaveBeenCalledWith('*')
    })
  })

  describe('paginate', () => {
    const mockData = [
      {
        id: '1',
        name: 'Test 1',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '2',
        name: 'Test 2',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]

    beforeEach(() => {
      // Mock the knex function call
      repository['knex'] = jest.fn().mockReturnValue(mockKnex)
    })

    it('should return paginated results with default options', async () => {
      mockKnex.count.mockResolvedValue([{ count: '10' }])
      mockKnex.limit.mockReturnValue(mockKnex)
      mockKnex.offset.mockReturnValue(mockKnex)
      mockKnex.orderBy.mockResolvedValue(mockData)

      const result = await repository.paginate()

      expect(result).toEqual({
        data: mockData,
        pagination: {
          page: 1,
          limit: 10,
          totalData: 10,
          totalPage: 1,
          next: false,
          prev: false
        }
      })
    })

    it('should return paginated results with custom options', async () => {
      const options: PaginationOptions = {
        page: 2,
        limit: 5,
        sortBy: 'name',
        sortOrder: 'asc'
      }

      mockKnex.count.mockResolvedValue([{ count: '15' }])
      mockKnex.limit.mockReturnValue(mockKnex)
      mockKnex.offset.mockReturnValue(mockKnex)
      mockKnex.orderBy.mockResolvedValue(mockData)

      const result = await repository.paginate(options)

      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        totalData: 15,
        totalPage: 3,
        next: true,
        prev: true
      })

      expect(mockKnex.limit).toHaveBeenCalledWith(5)
      expect(mockKnex.offset).toHaveBeenCalledWith(5) // (page - 1) * limit = (2 - 1) * 5 = 5
      expect(mockKnex.orderBy).toHaveBeenCalledWith('name', 'asc')
    })

    it('should handle empty results', async () => {
      mockKnex.count.mockResolvedValue([{ count: '0' }])
      mockKnex.limit.mockReturnValue(mockKnex)
      mockKnex.offset.mockReturnValue(mockKnex)
      mockKnex.orderBy.mockResolvedValue([])

      const result = await repository.paginate()

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

  describe('applySorting', () => {
    it('should apply default sorting', () => {
      const mockQuery = {
        orderBy: jest.fn().mockReturnThis()
      }

      repository['applySorting'](mockQuery as any)

      expect(mockQuery.orderBy).toHaveBeenCalledWith('created_at', 'desc')
    })

    it('should apply custom sorting', () => {
      const mockQuery = {
        orderBy: jest.fn().mockReturnThis()
      }

      repository['applySorting'](mockQuery as any, 'name', 'asc')

      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'asc')
    })

    it('should sanitize invalid column names', () => {
      const mockQuery = {
        orderBy: jest.fn().mockReturnThis()
      }

      // Test with potentially dangerous column name
      repository['applySorting'](
        mockQuery as any,
        'name; DROP TABLE users;',
        'asc'
      )

      // Should fallback to default
      expect(mockQuery.orderBy).toHaveBeenCalledWith('created_at', 'desc')
    })

    it('should allow table.column format', () => {
      const mockQuery = {
        orderBy: jest.fn().mockReturnThis()
      }

      repository['applySorting'](mockQuery as any, 'users.created_at', 'desc')

      expect(mockQuery.orderBy).toHaveBeenCalledWith('users.created_at', 'desc')
    })
  })

  describe('createPaginationMetadata', () => {
    it('should create correct pagination metadata for first page', () => {
      const result = repository['createPaginationMetadata'](1, 10, 25)

      expect(result).toEqual({
        page: 1,
        limit: 10,
        totalData: 25,
        totalPage: 3,
        next: true,
        prev: false
      })
    })

    it('should create correct pagination metadata for middle page', () => {
      const result = repository['createPaginationMetadata'](2, 10, 25)

      expect(result).toEqual({
        page: 2,
        limit: 10,
        totalData: 25,
        totalPage: 3,
        next: true,
        prev: true
      })
    })

    it('should create correct pagination metadata for last page', () => {
      const result = repository['createPaginationMetadata'](3, 10, 25)

      expect(result).toEqual({
        page: 3,
        limit: 10,
        totalData: 25,
        totalPage: 3,
        next: false,
        prev: true
      })
    })

    it('should handle exact division', () => {
      const result = repository['createPaginationMetadata'](2, 10, 20)

      expect(result).toEqual({
        page: 2,
        limit: 10,
        totalData: 20,
        totalPage: 2,
        next: false,
        prev: true
      })
    })
  })
})

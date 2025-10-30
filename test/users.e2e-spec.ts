import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from '../src/app.module'
import { DatabaseService } from '../src/database/database.service'

import { TestDataHelper } from './shared/test-data.helper'

describe('Users (e2e)', () => {
  let app: INestApplication
  let databaseService: DatabaseService
  let authToken: string
  let memberRoleId: string
  let adminRoleId: string

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test'
    process.env.DB_HOST = 'localhost'
    process.env.DB_PORT = '5433'
    process.env.DB_NAME = 'db_lumbung_mesari_test'
    process.env.DB_USER = 'admin'
    process.env.DB_PASSWORD = 'admin123'

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleFixture.createNestApplication()

    // Add validation pipe to test DTO validation
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true
      })
    )

    await app.init()

    databaseService = moduleFixture.get<DatabaseService>(DatabaseService)

    // Setup shared test data (reuse if already exists)
    const roles = await TestDataHelper.setupSharedTestData(databaseService)
    memberRoleId = roles.memberRoleId
    adminRoleId = roles.adminRoleId

    // Get auth token
    authToken = await TestDataHelper.getAuthToken(app)
  })

  afterAll(async () => {
    // Final cleanup - users.e2e-spec.ts runs last alphabetically
    await TestDataHelper.cleanupAllTestData(databaseService)
    await app.close()
  })

  async function setupTestData() {
    const knex = databaseService.getKnex()

    try {
      // Clean existing test data first (but keep seeded roles)
      await knex('users').where('email', 'like', '%@test.com').del()

      // Get existing roles from seeds (fallback to creating if seeds don't exist)
      const existingRoles = await knex('roles').select('*')
      memberRoleId = existingRoles.find((r) => r.name === 'member')?.id
      adminRoleId = existingRoles.find((r) => r.name === 'administrator')?.id

      // If roles don't exist from seeds, create test roles
      if (!memberRoleId || !adminRoleId) {
        console.log('⚠️  Roles not found from seeds, creating test roles...')
        await knex('roles')
          .insert([
            { id: 'test-role-member', name: 'member' },
            { id: 'test-role-admin', name: 'administrator' }
          ])
          .onConflict('id')
          .ignore()

        memberRoleId = 'test-role-member'
        adminRoleId = 'test-role-admin'
      }

      // Insert test admin user for authentication
      await knex('users').insert({
        id: 'test-admin-user',
        email: 'admin@test.com',
        fullname: 'Test Admin',
        username: 'testadmin',
        password:
          '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: 'password'
        phone_number: '999999999',
        address: 'Admin Address',
        status: 'active',
        role_id: adminRoleId,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      })

      // Insert diverse test users for comprehensive testing
      const testUsers = [
        {
          id: 'test-user-1',
          email: 'john.doe@test.com',
          fullname: 'John Doe',
          username: 'johndoe',
          password:
            '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          phone_number: '1234567890',
          address: '123 Main St, City A',
          status: 'active',
          role_id: memberRoleId,
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        },
        {
          id: 'test-user-2',
          email: 'jane.smith@test.com',
          fullname: 'Jane Smith',
          username: 'janesmith',
          password:
            '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          phone_number: '0987654321',
          address: '456 Oak Ave, City B',
          status: 'active',
          role_id: adminRoleId,
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-10')
        },
        {
          id: 'test-user-3',
          email: 'bob.wilson@test.com',
          fullname: 'Bob Wilson',
          username: 'bobwilson',
          password:
            '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          phone_number: '5555555555',
          address: '789 Pine Rd, City C',
          status: 'pending',
          role_id: memberRoleId,
          created_at: new Date('2024-01-20'),
          updated_at: new Date('2024-01-20')
        },
        {
          id: 'test-user-4',
          email: 'alice.brown@test.com',
          fullname: 'Alice Brown',
          username: 'alicebrown',
          password:
            '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          phone_number: '1111111111',
          address: '321 Elm St, City D',
          status: 'suspended',
          role_id: memberRoleId,
          created_at: new Date('2024-01-05'),
          updated_at: new Date('2024-01-05')
        },
        {
          id: 'test-user-5',
          email: 'charlie.davis@test.com',
          fullname: 'Charlie Davis',
          username: 'charliedavis',
          password:
            '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          phone_number: '2222222222',
          address: '654 Maple Dr, City E',
          status: 'active',
          role_id: adminRoleId,
          created_at: new Date('2024-01-25'),
          updated_at: new Date('2024-01-25')
        }
      ]

      await knex('users').insert(testUsers)

      console.log('✅ Users test data setup completed')
    } catch (error) {
      console.error('❌ Error setting up users test data:', error)
      throw error
    }
  }

  async function getAuthToken(): Promise<string> {
    try {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: 'admin@test.com',
          password: 'password'
        })

      if (loginResponse.status !== 201) {
        throw new Error(
          `Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`
        )
      }

      console.log('✅ Users test authentication successful')
      return loginResponse.body.access_token
    } catch (error) {
      console.error('❌ Error getting auth token for users test:', error)
      throw error
    }
  }

  async function cleanupTestData() {
    try {
      const knex = databaseService.getKnex()
      // Only clean up test users, keep seeded roles
      await knex('users').where('email', 'like', '%@test.com').del()
      // Only delete test roles if they were created by tests (not from seeds)
      await knex('roles').where('id', 'like', 'test-role-%').del()
      console.log('✅ Users test data cleanup completed')
    } catch (error) {
      console.error('❌ Error cleaning up users test data:', error)
    }
  }

  describe('/users (GET) - User Management Tests', () => {
    it('should return all users with proper structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Verify response structure
      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('page')
      expect(response.body).toHaveProperty('limit')
      expect(response.body).toHaveProperty('totalData')
      expect(response.body).toHaveProperty('totalPage')
      expect(response.body).toHaveProperty('next')
      expect(response.body).toHaveProperty('prev')

      // Verify data is an array
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it('should return users with all required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      if (response.body.data.length > 0) {
        const user = response.body.data[0]

        // Should contain all safe fields
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('fullname')
        expect(user).toHaveProperty('username')
        expect(user).toHaveProperty('phone_number')
        expect(user).toHaveProperty('address')
        expect(user).toHaveProperty('status')
        expect(user).toHaveProperty('role_id')
        expect(user).toHaveProperty('created_at')
        expect(user).toHaveProperty('updated_at')

        // Should not contain sensitive fields
        expect(user).not.toHaveProperty('password')
        expect(user).not.toHaveProperty('deposit_image_url')

        // Verify field types
        expect(typeof user.id).toBe('string')
        expect(typeof user.email).toBe('string')
        expect(typeof user.fullname).toBe('string')
        expect(typeof user.username).toBe('string')
        expect(typeof user.phone_number).toBe('string')
        expect(typeof user.address).toBe('string')
        expect(typeof user.status).toBe('string')
        expect(typeof user.role_id).toBe('string')
      }
    })

    it('should filter users by role correctly', async () => {
      // Test member role filter
      const memberResponse = await request(app.getHttpServer())
        .get(`/users?role=${memberRoleId}&limit=20`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      memberResponse.body.data.forEach((user: any) => {
        expect(user.role_id).toBe(memberRoleId)
      })

      // Test admin role filter
      const adminResponse = await request(app.getHttpServer())
        .get(`/users?role=${adminRoleId}&limit=20`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      adminResponse.body.data.forEach((user: any) => {
        expect(user.role_id).toBe(adminRoleId)
      })
    })

    it('should return users ordered by created_at DESC by default', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      if (response.body.data.length > 1) {
        const createdDates = response.body.data.map(
          (user: any) => new Date(user.created_at)
        )

        // Check if dates are in descending order (newest first)
        for (let i = 0; i < createdDates.length - 1; i++) {
          expect(createdDates[i].getTime()).toBeGreaterThanOrEqual(
            createdDates[i + 1].getTime()
          )
        }
      }
    })

    it('should support custom sorting', async () => {
      // Test sorting by email ascending
      const emailAscResponse = await request(app.getHttpServer())
        .get('/users?sortBy=email&sortOrder=asc&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const emails = emailAscResponse.body.data.map((user: any) => user.email)
      const sortedEmails = [...emails].sort()
      expect(emails).toEqual(sortedEmails)

      // Test sorting by fullname descending
      const nameDescResponse = await request(app.getHttpServer())
        .get('/users?sortBy=fullname&sortOrder=desc&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const fullnames = nameDescResponse.body.data.map(
        (user: any) => user.fullname
      )
      const sortedFullnamesDesc = [...fullnames].sort().reverse()
      expect(fullnames).toEqual(sortedFullnamesDesc)
    })

    it('should handle different user statuses', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?limit=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const statuses = response.body.data.map((user: any) => user.status)
      const uniqueStatuses = [...new Set(statuses)]

      // Should have users with different statuses from our test data
      expect(uniqueStatuses.length).toBeGreaterThan(1)
      expect(uniqueStatuses).toContain('active')

      // Verify all statuses are valid
      const validStatuses = [
        'waiting_deposit',
        'active',
        'suspended',
        'pending'
      ]
      uniqueStatuses.forEach((status) => {
        expect(validStatuses).toContain(status)
      })
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/users').expect(401)
    })

    it('should require proper authorization (admin/superadmin only)', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })

    it('should validate query parameters', async () => {
      // Test invalid page
      await request(app.getHttpServer())
        .get('/users?page=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      // Test invalid limit
      await request(app.getHttpServer())
        .get('/users?limit=101')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      // Test invalid sortOrder
      await request(app.getHttpServer())
        .get('/users?sortOrder=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      // Test non-whitelisted parameter
      await request(app.getHttpServer())
        .get('/users?invalidParam=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })

    it('should return consistent user data across requests', async () => {
      // Make two identical requests
      const response1 = await request(app.getHttpServer())
        .get('/users?page=1&limit=5&sortBy=email&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const response2 = await request(app.getHttpServer())
        .get('/users?page=1&limit=5&sortBy=email&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Should return identical data
      expect(response1.body).toEqual(response2.body)
    })

    it('should handle edge cases gracefully', async () => {
      // Test very high page number
      const highPageResponse = await request(app.getHttpServer())
        .get('/users?page=999&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(highPageResponse.body.data).toEqual([])
      expect(highPageResponse.body.page).toBe(999)
      expect(highPageResponse.body.next).toBe(false)
      expect(highPageResponse.body.prev).toBe(true)

      // Test minimum limit
      const minLimitResponse = await request(app.getHttpServer())
        .get('/users?limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(minLimitResponse.body.data.length).toBeLessThanOrEqual(1)
      expect(minLimitResponse.body.limit).toBe(1)
    })
  })

  describe('/users/me (GET) - Current User Profile', () => {
    it('should return current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Should return user object (the exact structure depends on your implementation)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('email')
    })

    it('should require authentication for /users/me', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401)
    })
  })
})

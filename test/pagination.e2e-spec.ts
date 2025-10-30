import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from '../src/app.module'
import { DatabaseService } from '../src/database/database.service'

import { TestDataHelper } from './shared/test-data.helper'

describe('Pagination (e2e)', () => {
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
    // Don't cleanup here - let the last test (users.e2e-spec.ts) handle cleanup
    await app.close()
  })

  describe('Pagination Functionality Tests', () => {
    it('should return paginated results with default parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('page', 1)
      expect(response.body).toHaveProperty('limit', 10)
      expect(response.body).toHaveProperty('totalData')
      expect(response.body).toHaveProperty('totalPage')
      expect(response.body).toHaveProperty('next')
      expect(response.body).toHaveProperty('prev', false)

      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeLessThanOrEqual(10)
      expect(response.body.totalData).toBeGreaterThan(0)
    })

    it('should handle different page sizes correctly', async () => {
      // Test with limit 5
      const response5 = await request(app.getHttpServer())
        .get('/users?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response5.body.limit).toBe(5)
      expect(response5.body.data.length).toBeLessThanOrEqual(5)

      // Test with limit 15
      const response15 = await request(app.getHttpServer())
        .get('/users?limit=15')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response15.body.limit).toBe(15)
      expect(response15.body.data.length).toBeLessThanOrEqual(15)
    })

    it('should navigate through pages correctly', async () => {
      // Get first page
      const page1 = await request(app.getHttpServer())
        .get('/users?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(page1.body.page).toBe(1)
      expect(page1.body.prev).toBe(false)

      if (page1.body.totalData > 5) {
        expect(page1.body.next).toBe(true)

        // Get second page
        const page2 = await request(app.getHttpServer())
          .get('/users?page=2&limit=5')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(page2.body.page).toBe(2)
        expect(page2.body.prev).toBe(true)

        // Ensure different data on different pages
        const page1Ids = page1.body.data.map((u: any) => u.id)
        const page2Ids = page2.body.data.map((u: any) => u.id)
        expect(page1Ids).not.toEqual(page2Ids)

        // No overlapping IDs between pages
        const overlap = page1Ids.filter((id: string) => page2Ids.includes(id))
        expect(overlap).toHaveLength(0)
      }
    })

    it('should calculate pagination metadata correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=7') // Use odd number to test calculation
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const { totalData, limit, totalPage, page, next, prev } = response.body

      // Verify totalPage calculation
      const expectedTotalPage = Math.ceil(totalData / limit)
      expect(totalPage).toBe(expectedTotalPage)

      // Verify next/prev logic for first page
      expect(prev).toBe(false)
      expect(next).toBe(totalPage > 1)

      // Test middle page if possible
      if (totalPage > 2) {
        const middlePage = Math.floor(totalPage / 2)
        const middleResponse = await request(app.getHttpServer())
          .get(`/users?page=${middlePage}&limit=7`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(middleResponse.body.prev).toBe(true)
        expect(middleResponse.body.next).toBe(true)
      }

      // Test last page
      if (totalPage > 1) {
        const lastPageResponse = await request(app.getHttpServer())
          .get(`/users?page=${totalPage}&limit=7`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)

        expect(lastPageResponse.body.next).toBe(false)
        expect(lastPageResponse.body.prev).toBe(true)
      }
    })

    it('should handle edge cases gracefully', async () => {
      // Test page beyond available data
      const highPageResponse = await request(app.getHttpServer())
        .get('/users?page=999&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(highPageResponse.body.data).toEqual([])
      expect(highPageResponse.body.page).toBe(999)
      expect(highPageResponse.body.next).toBe(false)
      expect(highPageResponse.body.prev).toBe(true)

      // Test with minimum limit
      const minLimitResponse = await request(app.getHttpServer())
        .get('/users?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(minLimitResponse.body.limit).toBe(1)
      expect(minLimitResponse.body.data.length).toBeLessThanOrEqual(1)

      // Test with maximum allowed limit
      const maxLimitResponse = await request(app.getHttpServer())
        .get('/users?page=1&limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(maxLimitResponse.body.limit).toBe(100)
    })

    it('should maintain consistent ordering across pages', async () => {
      // Get multiple pages with same sorting
      const page1 = await request(app.getHttpServer())
        .get('/users?page=1&limit=5&sortBy=email&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const page2 = await request(app.getHttpServer())
        .get('/users?page=2&limit=5&sortBy=email&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      if (page1.body.data.length > 0 && page2.body.data.length > 0) {
        const lastEmailPage1 = page1.body.data[page1.body.data.length - 1].email
        const firstEmailPage2 = page2.body.data[0].email

        // Last email of page 1 should be <= first email of page 2 (ascending order)
        expect(
          lastEmailPage1.localeCompare(firstEmailPage2)
        ).toBeLessThanOrEqual(0)
      }
    })

    it('should validate pagination parameters', async () => {
      // Test invalid page (less than 1)
      await request(app.getHttpServer())
        .get('/users?page=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      // Test invalid page (non-integer)
      await request(app.getHttpServer())
        .get('/users?page=abc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      // Test invalid limit (greater than max)
      await request(app.getHttpServer())
        .get('/users?limit=101')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      // Test invalid limit (less than 1)
      await request(app.getHttpServer())
        .get('/users?limit=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      // Test invalid sortOrder
      await request(app.getHttpServer())
        .get('/users?sortOrder=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })

    it('should handle large datasets efficiently', async () => {
      // Test with all our test data (30+ users)
      const startTime = Date.now()

      const response = await request(app.getHttpServer())
        .get('/users?page=1&limit=50')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      // Should respond within reasonable time (adjust threshold as needed)
      expect(responseTime).toBeLessThan(1000) // 1 second

      expect(response.body.totalData).toBeGreaterThanOrEqual(30)
      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it('should return consistent results for identical requests', async () => {
      const params = '?page=2&limit=5&sortBy=fullname&sortOrder=asc'

      const response1 = await request(app.getHttpServer())
        .get(`/users${params}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const response2 = await request(app.getHttpServer())
        .get(`/users${params}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Should return identical results
      expect(response1.body).toEqual(response2.body)
    })

    it('should handle role filtering with pagination', async () => {
      // Test pagination with role filter
      const response = await request(app.getHttpServer())
        .get(`/users?role=${memberRoleId}&page=1&limit=5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // All returned users should have the specified role
      response.body.data.forEach((user: any) => {
        expect(user.role_id).toBe(memberRoleId)
      })

      // Pagination metadata should reflect filtered results
      expect(response.body.totalData).toBeLessThanOrEqual(30) // Should be less than total users
    })
  })
})

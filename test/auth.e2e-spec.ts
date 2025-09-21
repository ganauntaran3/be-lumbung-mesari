import * as request from 'supertest'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from '../src/app.module'

describe('AuthController (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleFixture.createNestApplication()

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    )

    app.setGlobalPrefix('api')

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/login', () => {
    it('should return tokens when login with valid email credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 'admin@lumbungmesari.com',
          password: 'admin123'
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token')
          expect(res.body).toHaveProperty('refresh_token')
          expect(typeof res.body.access_token).toBe('string')
          expect(typeof res.body.refresh_token).toBe('string')
          expect(res.body.access_token).not.toBe('')
          expect(res.body.refresh_token).not.toBe('')
        })
    })

    it('should return tokens when login with valid username credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 'admin',
          password: 'admin123'
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token')
          expect(res.body).toHaveProperty('refresh_token')
          expect(typeof res.body.access_token).toBe('string')
          expect(typeof res.body.refresh_token).toBe('string')
        })
    })

    it('should return 401 when login with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 'admin@lumbungmesari.com',
          password: 'wrongpassword'
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(res.body.message).toBe('Invalid credentials')
        })
    })

    it('should return 401 when login with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 'nonexistent@example.com',
          password: 'anypassword'
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(res.body.message).toBe('Invalid credentials')
        })
    })

    it('should return 400 when identifier is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          password: 'admin123'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(Array.isArray(res.body.message)).toBe(true)
          expect(res.body.message).toContain('identifier should not be empty')
        })
    })

    it('should return 400 when password is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 'admin@lumbungmesari.com'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(Array.isArray(res.body.message)).toBe(true)
          expect(res.body.message).toContain('password should not be empty')
        })
    })

    it('should return 400 when identifier is empty string', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: '',
          password: 'admin123'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(Array.isArray(res.body.message)).toBe(true)
          expect(res.body.message).toContain('identifier should not be empty')
        })
    })

    it('should return 400 when password is empty string', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 'admin@lumbungmesari.com',
          password: ''
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(Array.isArray(res.body.message)).toBe(true)
          expect(res.body.message).toContain('password should not be empty')
        })
    })

    it('should return 400 when identifier is not a string', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 123,
          password: 'admin123'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(Array.isArray(res.body.message)).toBe(true)
          expect(res.body.message).toContain('identifier must be a string')
        })
    })

    it('should return 400 when password is not a string', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 'admin@lumbungmesari.com',
          password: 123
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(Array.isArray(res.body.message)).toBe(true)
          expect(res.body.message).toContain('password must be a string')
        })
    })

    it('should return 400 when extra properties are provided (forbidNonWhitelisted)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: 'admin@lumbungmesari.com',
          password: 'Admin123!',
          extraField: 'should not be allowed'
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(Array.isArray(res.body.message)).toBe(true)
          expect(res.body.message).toContain(
            'property extraField should not exist'
          )
        })
    })

    it('should return 400 when request body is empty', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message')
          expect(Array.isArray(res.body.message)).toBe(true)
          expect(res.body.message).toContain('identifier should not be empty')
          expect(res.body.message).toContain('password should not be empty')
        })
    })

    it('should return 400 when Content-Type is not application/json', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('identifier=admin&password=admin123')
        .expect(400)
    })
  })
})

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { DatabaseService } from '../src/database/database.service'

import { AppModule } from './../src/app.module'
import { TestDataHelper } from './shared/test-data.helper'

describe('AppController (e2e)', () => {
  let app: INestApplication
  let databaseService: DatabaseService

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test'
    process.env.DB_HOST = 'localhost'
    process.env.DB_PORT = '5433'
    process.env.DB_NAME = 'db_lumbung_mesari_test'
    process.env.DB_USER = 'admin'
    process.env.DB_PASSWORD = 'admin123'

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    databaseService = moduleFixture.get<DatabaseService>(DatabaseService)

    // Setup shared test data (this runs first alphabetically)
    await TestDataHelper.setupSharedTestData(databaseService)
  })

  afterAll(async () => {
    await app.close()
  })

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!')
  })
})

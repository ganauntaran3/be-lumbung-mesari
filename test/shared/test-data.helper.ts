import { DatabaseService } from '../../src/database/database.service'

export class TestDataHelper {
  private static isDataSetup = false
  private static roles: { memberRoleId: string; adminRoleId: string } | null =
    null

  static async setupSharedTestData(databaseService: DatabaseService): Promise<{
    memberRoleId: string
    adminRoleId: string
  }> {
    const knex = databaseService.getKnex()

    try {
      // Check if data is already setup
      if (this.isDataSetup && this.roles) {
        console.log('✅ Test data already exists, reusing...')
        return this.roles
      }

      console.log('🔧 Setting up shared test data...')

      // Get existing roles from seeds (fallback to creating if seeds don't exist)
      const existingRoles = await knex('roles').select('*')
      let memberRoleId = existingRoles.find((r) => r.name === 'member')?.id
      let adminRoleId = existingRoles.find(
        (r) => r.name === 'administrator'
      )?.id

      // If roles don't exist from seeds, create test roles
      if (!memberRoleId || !adminRoleId) {
        console.log('⚠️  Roles not found from seeds, creating test roles...')
        await knex('roles')
          .insert([
            { id: 'shared-role-member', name: 'member' },
            { id: 'shared-role-admin', name: 'administrator' }
          ])
          .onConflict('id')
          .ignore()

        memberRoleId = 'shared-role-member'
        adminRoleId = 'shared-role-admin'
      }

      // Check if admin user already exists
      const existingAdmin = await knex('users')
        .where('email', 'admin@test.com')
        .first()

      if (!existingAdmin) {
        // Insert test admin user for authentication
        await knex('users')
          .insert({
            id: 'shared-admin-user',
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
          .onConflict('id')
          .ignore()
      }

      // Check if test users already exist
      const existingTestUsers = await knex('users')
        .where('email', 'like', 'user%@test.com')
        .count('* as count')
        .first()

      const testUserCount = parseInt(
        (existingTestUsers?.count as string) || '0'
      )

      if (testUserCount < 25) {
        console.log(
          `📝 Creating ${25 - testUserCount} additional test users...`
        )

        // Insert test users for pagination testing
        const testUsers = Array.from({ length: 25 - testUserCount }, (_, i) => {
          const userIndex = testUserCount + i + 1
          return {
            id: `shared-user-${userIndex}`,
            email: `user${userIndex}@test.com`,
            fullname: `Test User ${String(userIndex).padStart(2, '0')}`,
            username: `testuser${userIndex}`,
            password:
              '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            phone_number: `${1000000000 + userIndex}`,
            address: `Test Address ${userIndex}`,
            status: 'active',
            role_id: userIndex % 3 === 0 ? adminRoleId : memberRoleId,
            created_at: new Date(
              `2024-01-${String((userIndex % 30) + 1).padStart(2, '0')}`
            ),
            updated_at: new Date(
              `2024-01-${String((userIndex % 30) + 1).padStart(2, '0')}`
            )
          }
        })

        if (testUsers.length > 0) {
          await knex('users').insert(testUsers).onConflict('id').ignore()
        }
      }

      // Cache the setup state
      this.isDataSetup = true
      this.roles = { memberRoleId, adminRoleId }

      console.log('✅ Shared test data setup completed')
      return this.roles
    } catch (error) {
      console.error('❌ Error setting up shared test data:', error)
      throw error
    }
  }

  static async getAuthToken(app: any): Promise<string> {
    const request = require('supertest')

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

      return loginResponse.body.access_token
    } catch (error) {
      console.error('❌ Error getting auth token:', error)
      throw error
    }
  }

  static async cleanupAllTestData(
    databaseService: DatabaseService
  ): Promise<void> {
    try {
      const knex = databaseService.getKnex()

      // Clean up all test data
      await knex('users').where('email', 'like', '%@test.com').del()
      await knex('roles').where('id', 'like', 'shared-role-%').del()

      // Reset the setup state
      this.isDataSetup = false
      this.roles = null

      console.log('✅ All test data cleanup completed')
    } catch (error) {
      console.error('❌ Error cleaning up test data:', error)
    }
  }

  static getRoles(): { memberRoleId: string; adminRoleId: string } | null {
    return this.roles
  }
}

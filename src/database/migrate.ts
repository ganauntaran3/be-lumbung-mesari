import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { DatabaseService } from './database.service'
import { FileMigrationProvider, Migrator } from 'kysely'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

async function bootstrap() {
  // Create a temporary app context for migrations
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log']
  })

  try {
    // Get the database service
    const db = app.get(DatabaseService)

    // Create migrator instance
    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, 'migrations')
      })
    })

    // Run migrations
    const { results, error } = await migrator.migrateToLatest()

    if (error) {
      console.error('❌ Migration failed')
      console.error(error)
      process.exit(1)
    }

    // Log migration results
    if (!results || results.length === 0) {
      console.log('✅ No migrations to run')
    } else {
      for (const m of results) {
        if (m.status === 'Success') {
          console.log(`✅ Migrated: ${m.migrationName}`)
        } else if (m.status === 'Error') {
          console.error(`❌ Failed to run migration: ${m.migrationName}`)
        }
      }
    }

    console.log('🎉 Migration completed successfully')
  } catch (err) {
    console.error('❌ Unexpected error during migration:')
    console.error(err)
    process.exit(1)
  } finally {
    // Close the app context
    await app.close()
  }
}

// Run the migration
bootstrap().catch((err) => {
  console.error('❌ Fatal error during migration:')
  console.error(err)
  process.exit(1)
})

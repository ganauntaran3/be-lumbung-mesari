import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { DatabaseService } from './database.service'
import { FileMigrationProvider, Migrator } from 'kysely'
import { promises as fs } from 'fs'
import path from 'path'

async function migrate() {
  const app = await NestFactory.createApplicationContext(AppModule)

  const db = app.get(DatabaseService)

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations')
    })
  })

  const result = await migrator.migrateToLatest()

  if (result.error) {
    console.error('❌ Migration failed')
    console.error(result.error)
    process.exit(1)
  }

  for (const m of result?.results) {
    if (m.status === 'Success') {
      console.log(`✅ Migrated: ${m.migrationName}`)
    }
  }

  await db.destroy()
  await app.close()
  console.log('🎉 Migration completed successfully')
}

migrate()

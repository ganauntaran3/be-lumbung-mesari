import * as fs from 'fs'
import * as path from 'path'

// Ambil argumen nama migrasi dari CLI
const name = process.argv[2]

if (!name) {
  console.error(
    '❌ Please provide a migration name. Example: npm run make:migration create_users_table'
  )
  process.exit(1)
}

// Buat timestamp format: 20240516171500
const timestamp = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14)

const filename = `${timestamp}_${name}.ts`
const folder = path.join(__dirname, 'migrations')
const filepath = path.join(folder, filename)

const template = `import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // TODO: implement up migration
}

export async function down(db: Kysely<any>): Promise<void> {
  // TODO: implement down migration
}
`

// Buat folder jika belum ada
if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder, { recursive: true })
}

// Tulis file migrasi
fs.writeFileSync(filepath, template)
console.log('✅ Migration created at:', filepath)

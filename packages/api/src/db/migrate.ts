import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../drizzle'
)

export async function runMigrations(): Promise<void> {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 })
  await migrate(drizzle(client), { migrationsFolder })
  await client.end()
  console.log('Migrations complete')
}

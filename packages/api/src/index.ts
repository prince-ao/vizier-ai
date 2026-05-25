import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { runMigrations } from './db/migrate.js'
import { webhookRoute } from './routes/webhook.js'
import { validateRoute } from './routes/validate.js'

const app = new Hono()

// @spec LIC-API-017
app.get('/health', (c) => c.json({ ok: true }))
app.route('/webhook', webhookRoute)
app.route('/', validateRoute)

const port = Number(process.env.PORT) || 3000

await runMigrations()
serve({ fetch: app.fetch, port }, () => {
  console.log(`Listening on port ${port}`)
})

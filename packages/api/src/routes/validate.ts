import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { licenses } from '../db/schema.js'

export const validateRoute = new Hono()

// @spec LIC-API-010, LIC-API-011, LIC-API-012, LIC-API-013, LIC-API-014
validateRoute.post('/validate', async (c) => {
  const body = await c.req.json().catch(() => null)

  // @spec LIC-API-014
  if (!body?.licenseKey || typeof body.licenseKey !== 'string') {
    return c.json({ error: 'licenseKey is required' }, 400)
  }

  // @spec LIC-API-010
  const [row] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.licenseKey, body.licenseKey))
    .limit(1)

  // @spec LIC-API-013
  if (!row) {
    return c.json({ valid: false, status: 'not_found', email: null, productVersion: null })
  }

  const active = row.status === 'active'

  // @spec LIC-API-011, LIC-API-012
  return c.json({
    valid: active,
    status: row.status,
    email: active ? row.email : null,
    productVersion: active ? row.productVersion : null,
  })
})

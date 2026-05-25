import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { licenses } from '../db/schema.js'
import { verifySignature } from '../lib/hmac.js'

export const webhookRoute = new Hono()

// @spec LIC-API-001, LIC-API-002, LIC-API-003, LIC-API-004, LIC-API-005, LIC-API-006, LIC-API-007, LIC-API-008
webhookRoute.post('/lemonsqueezy', async (c) => {
  // @spec LIC-API-001 — raw bytes before any JSON parse
  const rawBody = Buffer.from(await c.req.arrayBuffer())
  const signature = c.req.header('x-signature') ?? ''
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? ''

  // @spec LIC-API-002, LIC-API-003
  if (!verifySignature(rawBody, signature, secret)) {
    console.warn('Webhook: signature mismatch')
    return c.json({ error: 'Invalid signature' }, 401)
  }

  // @spec LIC-API-004
  const payload = JSON.parse(rawBody.toString('utf8'))
  const eventName: string = payload.meta?.event_name ?? ''

  try {
    if (eventName === 'license_key_created') {
      // @spec LIC-API-005, LIC-API-009, LIC-API-016
      // Paths verified against live payload 2026-05-25.
      // status is 'inactive' on creation; transitions to 'active' via license_key_updated.
      // product_name is not in this resource — use PRODUCT_NAME env var.
      const attrs = payload.data?.attributes ?? {}
      const licenseKey: string = attrs.key ?? ''
      const email: string = attrs.user_email ?? ''
      const productVersion: string = process.env.PRODUCT_NAME ?? 'Vizier'
      const createdAt = attrs.created_at ? new Date(attrs.created_at) : new Date()
      const rawStatus: string = attrs.status ?? 'inactive'
      const status = (['active', 'inactive', 'expired'] as const).includes(
        rawStatus as 'active' | 'inactive' | 'expired'
      )
        ? (rawStatus as 'active' | 'inactive' | 'expired')
        : 'inactive'

      await db
        .insert(licenses)
        .values({ licenseKey, email, productVersion, status, createdAt })
        .onConflictDoUpdate({
          target: licenses.licenseKey,
          set: { email, productVersion, status },
        })
    } else if (eventName === 'license_key_updated') {
      // @spec LIC-API-006, LIC-API-009
      const attrs = payload.data?.attributes ?? {}
      const licenseKey: string = attrs.key ?? ''
      const rawStatus: string = attrs.status ?? ''
      const status = (['active', 'inactive', 'expired'] as const).includes(
        rawStatus as 'active' | 'inactive' | 'expired'
      )
        ? (rawStatus as 'active' | 'inactive' | 'expired')
        : 'inactive'

      if (licenseKey) {
        await db
          .update(licenses)
          .set({ status })
          .where(eq(licenses.licenseKey, licenseKey))
      }
    }
    // @spec LIC-API-007 — unrecognised events fall through to the 200 below
  } catch (err) {
    // Log but still return 200 — non-2xx causes LS to retry indefinitely
    console.error('Webhook: DB error', err)
  }

  // @spec LIC-API-008
  return c.json({ received: true })
})

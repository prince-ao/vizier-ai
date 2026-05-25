import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

// @spec LIC-API-015
export const licenses = pgTable('licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  licenseKey: text('license_key').unique().notNull(),
  email: text('email').notNull(),
  productVersion: text('product_version').notNull(),
  status: text('status').notNull().$type<'active' | 'inactive' | 'expired'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type License = typeof licenses.$inferSelect
export type NewLicense = typeof licenses.$inferInsert

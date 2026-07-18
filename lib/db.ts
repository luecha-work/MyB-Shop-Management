import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured')
}

const globalForPg = globalThis as unknown as { pgPool?: Pool }

export const db =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = db
}

export const toNumber = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export const toDateParam = (value: string | null, fallback: string) => {
  if (!value) return fallback
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback
}

export const toUuidParam = (value: string | null | undefined) => {
  if (!value) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}

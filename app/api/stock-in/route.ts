import { NextRequest, NextResponse } from 'next/server'
import { db, toDateParam, toNumber } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const startDate = toDateParam(request.nextUrl.searchParams.get('startDate'), firstDay)
  const endDate = toDateParam(request.nextUrl.searchParams.get('endDate'), lastDay)

  try {
    const { rows } = await db.query(
      `
        SELECT
          id,
          transaction_timestamp,
          product_id,
          product_name,
          quantity,
          note
        FROM stock_in
        WHERE transaction_timestamp >= $1::date
          AND transaction_timestamp < ($2::date + INTERVAL '1 day')
        ORDER BY transaction_timestamp DESC, created_at DESC
      `,
      [startDate, endDate],
    )

    return NextResponse.json({
      rows: rows.map((row) => ({
        id: row.id,
        date: row.transaction_timestamp,
        productId: row.product_id || '',
        productName: row.product_name || '',
        qty: toNumber(row.quantity),
        note: row.note || '',
      })),
    })
  } catch (error) {
    console.error('GET /api/stock-in failed', error)
    return NextResponse.json({ error: 'Failed to load stock-in history' }, { status: 500 })
  }
}

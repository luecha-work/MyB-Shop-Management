import { NextRequest, NextResponse } from 'next/server'
import { db, toDateParam, toNumber, toUuidParam } from '@/lib/db'
import { sessionFromRequest } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const startDate = toDateParam(request.nextUrl.searchParams.get('startDate'), firstDay)
  const endDate = toDateParam(request.nextUrl.searchParams.get('endDate'), lastDay)
  const session = sessionFromRequest(request)
  const branchId = session?.role === 'STAFF'
    ? toUuidParam(session.branchId)
    : toUuidParam(request.nextUrl.searchParams.get('branchId')?.trim())
  const branchFilter = session?.role === 'STAFF' && !branchId
    ? 'AND FALSE'
    : branchId
      ? 'AND si.branch_id = $3::uuid'
      : ''
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate]

  try {
    const { rows } = await db.query(
      `
        SELECT
          si.id,
          si.transaction_timestamp,
          si.product_id,
          COALESCE(NULLIF(p.product_name, ''), 'ไม่ระบุสินค้า') AS product_name,
          si.quantity,
          si.note
        FROM stock_in si
        LEFT JOIN products p ON p.id = si.product_id
        WHERE si.transaction_timestamp >= $1::date
          AND si.transaction_timestamp < ($2::date + INTERVAL '1 day')
          ${branchFilter}
        ORDER BY si.transaction_timestamp DESC, si.created_at DESC
      `,
      params,
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

import { NextRequest, NextResponse } from 'next/server'
import { db, toDateParam, toNumber, toUuidParam } from '@/lib/db'
import { canManageSettings, sessionFromRequest } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const startDate = toDateParam(request.nextUrl.searchParams.get('startDate'), firstDay)
  const endDate = toDateParam(request.nextUrl.searchParams.get('endDate'), lastDay)
  const session = await sessionFromRequest(request)
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

export async function DELETE(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (!canManageSettings(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids)
      ? body.ids.map((id: unknown) => String(id).trim()).filter(Boolean)
      : []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกประวัติรับเข้าที่ต้องการลบ' }, { status: 400 })
    }

    const { rowCount } = await db.query(
      `
        DELETE FROM stock_in
        WHERE id = ANY($1::uuid[])
      `,
      [ids],
    )

    return NextResponse.json({ deleted: rowCount ?? 0 })
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '22P02') {
      return NextResponse.json({ error: 'รายการประวัติรับเข้าที่เลือกไม่ถูกต้อง' }, { status: 400 })
    }
    console.error('DELETE /api/stock-in failed', error)
    return NextResponse.json({ error: 'Failed to delete stock-in history' }, { status: 500 })
  }
}

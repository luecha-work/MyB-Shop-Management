import { NextRequest, NextResponse } from 'next/server'
import { db, toDateParam, toNumber, toUuidParam } from '@/lib/db'
import { canManageSettings, sessionFromRequest } from '@/lib/auth/session'
import { normalizeGpRate } from '@/lib/constants'

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
      ? 'AND s.branch_id = $3::uuid'
      : ''
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate]

  try {
    const { rows } = await db.query(
      `
        SELECT
          s.id,
          s.order_id,
          s.order_datetime,
          s.channel,
          s.note,
          COALESCE(NULLIF(p.product_name, ''), 'ไม่ระบุสินค้า') AS product_name,
          s.qty,
          s.total_sales,
          s.net_profit,
          s.gp_percent,
          s.gp_amount,
          s.net_revenue,
          s.unit_price,
          s.unit_cost,
          s.total_cost
        FROM sales s
        LEFT JOIN products p ON p.id = s.product_id
        WHERE s.order_datetime >= $1::date
          AND s.order_datetime < ($2::date + INTERVAL '1 day')
          ${branchFilter}
        ORDER BY s.order_datetime DESC, s.created_at DESC
      `,
      params,
    )

    return NextResponse.json({
      rows: rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        date: row.order_datetime,
        channel: row.channel || '',
        note: row.note || '',
        productName: row.product_name || '',
        qty: toNumber(row.qty),
        totalSales: toNumber(row.total_sales),
        netProfit: toNumber(row.net_profit),
        gpRate: normalizeGpRate(row.gp_percent),
        gpAmount: toNumber(row.gp_amount),
        netRevenue: toNumber(row.net_revenue),
        unitPrice: toNumber(row.unit_price),
        unitCost: toNumber(row.unit_cost),
        totalCost: toNumber(row.total_cost),
      })),
    })
  } catch (error) {
    console.error('GET /api/sales-history failed', error)
    return NextResponse.json({ error: 'Failed to load sales history' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (!canManageSettings(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const orderIds: string[] = Array.isArray(body.orderIds)
      ? body.orderIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : []

    if (orderIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกออเดอร์ที่ต้องการลบ' }, { status: 400 })
    }

    const { rowCount } = await db.query(
      `
        DELETE FROM sales
        WHERE order_id = ANY($1::text[])
      `,
      [orderIds],
    )

    return NextResponse.json({ deleted: rowCount ?? 0 })
  } catch (error) {
    console.error('DELETE /api/sales-history failed', error)
    return NextResponse.json({ error: 'Failed to delete sales history' }, { status: 500 })
  }
}

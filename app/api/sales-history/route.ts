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

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `
          SELECT id
          FROM sales
          WHERE order_id = ANY($1::text[])
          FOR UPDATE
        `,
        [orderIds],
      )

      const { rows: restoreRows } = await client.query<{ product_id: string; qty: number }>(
        `
          SELECT product_id, SUM(qty)::int AS qty
          FROM sales
          WHERE order_id = ANY($1::text[])
            AND product_id IS NOT NULL
          GROUP BY product_id
        `,
        [orderIds],
      )

      for (const row of restoreRows) {
        await client.query(
          `
            UPDATE products
            SET current_stock = current_stock + $2,
                stock_out = GREATEST(stock_out - $2, 0),
                status = CASE
                  WHEN current_stock + $2 <= 0 THEN 'Out of Stock'
                  WHEN current_stock + $2 <= min_stock THEN 'Low Stock'
                  ELSE 'Active'
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [row.product_id, row.qty],
        )
      }

      const { rowCount } = await client.query(
        `
          DELETE FROM sales
          WHERE order_id = ANY($1::text[])
        `,
        [orderIds],
      )

      await client.query('COMMIT')
      return NextResponse.json({ deleted: rowCount ?? 0, restoredProducts: restoreRows.length })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('DELETE /api/sales-history failed', error)
    return NextResponse.json({ error: 'Failed to delete sales history' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db, toDateParam, toNumber } from '@/lib/db'

export const runtime = 'nodejs'

const normalizeGpRate = (value: unknown) => {
  const rate = toNumber(value)
  return rate > 1 ? rate / 100 : rate
}

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
          order_id,
          order_datetime,
          channel,
          note,
          product_name,
          qty,
          total_sales,
          net_profit,
          gp_percent
        FROM sales
        WHERE order_datetime >= $1::date
          AND order_datetime < ($2::date + INTERVAL '1 day')
        ORDER BY order_datetime DESC, created_at DESC
      `,
      [startDate, endDate],
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
      })),
    })
  } catch (error) {
    console.error('GET /api/sales-history failed', error)
    return NextResponse.json({ error: 'Failed to load sales history' }, { status: 500 })
  }
}

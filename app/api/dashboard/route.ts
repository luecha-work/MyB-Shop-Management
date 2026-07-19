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
  const session = await sessionFromRequest(request)
  const branchId = session?.role === 'STAFF'
    ? toUuidParam(session.branchId)
    : toUuidParam(request.nextUrl.searchParams.get('branchId')?.trim())
  const branchFilter = session?.role === 'STAFF' && !branchId
    ? 'AND FALSE'
    : branchId
      ? 'AND sales.branch_id = $3::uuid'
      : ''
  const params = branchId ? [startDate, endDate, branchId] : [startDate, endDate]

  try {
    const [summary, channelSales, topProducts, inventoryCost] = await Promise.all([
      db.query(
        `
          SELECT
            COALESCE(SUM(total_sales), 0) AS total_sales,
            COALESCE(SUM(net_revenue), 0) AS net_revenue,
            COALESCE(SUM(total_cost), 0) AS total_cost,
            COALESCE(SUM(net_profit), 0) AS net_profit
          FROM sales
          WHERE order_datetime >= $1::date
            AND order_datetime < ($2::date + INTERVAL '1 day')
            ${branchFilter}
        `,
        params,
      ),
      db.query(
        `
          SELECT
            COALESCE(NULLIF(channel, ''), 'ไม่ระบุ') AS name,
            COALESCE(SUM(total_sales), 0) AS sales
          FROM sales
          WHERE order_datetime >= $1::date
            AND order_datetime < ($2::date + INTERVAL '1 day')
            ${branchFilter}
          GROUP BY COALESCE(NULLIF(channel, ''), 'ไม่ระบุ')
          ORDER BY sales DESC
        `,
        params,
      ),
      db.query(
        `
          SELECT
            COALESCE(NULLIF(products.product_name, ''), 'ไม่ระบุสินค้า') AS name,
            COALESCE(SUM(qty), 0) AS qty,
            COALESCE(SUM(total_sales), 0) AS sales
          FROM sales
          LEFT JOIN products ON products.id = sales.product_id
          WHERE order_datetime >= $1::date
            AND order_datetime < ($2::date + INTERVAL '1 day')
            ${branchFilter}
          GROUP BY COALESCE(NULLIF(products.product_name, ''), 'ไม่ระบุสินค้า')
          ORDER BY qty DESC, sales DESC
          LIMIT 100
        `,
        params,
      ),
      db.query(
        `
          SELECT
            COALESCE(SUM(cost * current_stock), 0) AS inventory_total_cost
          FROM products
        `,
      ),
    ])

    const row = summary.rows[0] ?? {}
    const inventoryRow = inventoryCost.rows[0] ?? {}
    return NextResponse.json({
      totalSales: toNumber(row.total_sales),
      netRevenue: toNumber(row.net_revenue),
      totalCost: toNumber(row.total_cost),
      netProfit: toNumber(row.net_profit),
      inventoryTotalCost: toNumber(inventoryRow.inventory_total_cost),
      channelSales: channelSales.rows.map((item) => ({
        name: item.name,
        sales: toNumber(item.sales),
      })),
      topProducts: topProducts.rows.map((item) => ({
        name: item.name,
        qty: toNumber(item.qty),
        sales: toNumber(item.sales),
      })),
    })
  } catch (error) {
    console.error('GET /api/dashboard failed', error)
    return NextResponse.json({ error: 'Failed to load dashboard stats' }, { status: 500 })
  }
}

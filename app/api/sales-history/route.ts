import { NextRequest, NextResponse } from 'next/server'
import { db, toDateParam, toNumber, toUuidParam } from '@/lib/db'
import { canManageSettings, sessionFromRequest } from '@/lib/auth/session'
import { computeSaleLine, gpRateForChannel, normalizeGpRate } from '@/lib/constants'

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

  if (!branchId) {
    return NextResponse.json({ error: 'กรุณาเลือกสาขา' }, { status: 400 })
  }

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
          s.total_cost,
          s.branch_id,
          b.branch_name,
          b.branch_code
        FROM sales s
        LEFT JOIN products p ON p.id = s.product_id
        LEFT JOIN branches b ON b.id = s.branch_id
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
        branchId: row.branch_id || '',
        branchName: row.branch_name || '',
        branchCode: row.branch_code || '',
      })),
    })
  } catch (error) {
    console.error('GET /api/sales-history failed', error)
    return NextResponse.json({ error: 'Failed to load sales history' }, { status: 500 })
  }
}

const toPositiveInteger = (value: unknown) => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

const randomOrderId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 12; i += 1) suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  return `ORD-${suffix}`
}

export async function POST(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const orderId = String(body.orderId ?? '').trim() || randomOrderId()
    const channel = String(body.channel ?? '').trim()
    const note = String(body.note ?? '').trim() || null
    const items: unknown[] = Array.isArray(body.items) ? body.items : []
    // STAFF always use their session branch; OWNER/ADMIN can pass a specific branchId
    const branchId = session.role === 'STAFF'
      ? toUuidParam(session.branchId)
      : (toUuidParam(String(body.branchId ?? '').trim()) || toUuidParam(session.branchId))

    if (!branchId) {
      return NextResponse.json({ error: 'กรุณาเลือกสาขาที่ต้องการขาย' }, { status: 400 })
    }

    if (!channel || items.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกสินค้าและช่องทางขายให้ครบถ้วน' }, { status: 400 })
    }

    const normalizedItems: { productId: string; qty: number }[] = items
      .map((rawItem: unknown) => {
        const item = rawItem && typeof rawItem === 'object' ? rawItem as Record<string, unknown> : {}
        return {
          productId: toUuidParam(String(item.productId ?? '').trim()),
          qty: toPositiveInteger(item.qty),
        }
      })
      .filter((item: { productId: string | null; qty: number | null }): item is { productId: string; qty: number } => (
        Boolean(item.productId) && item.qty != null
      ))

    if (normalizedItems.length !== items.length) {
      return NextResponse.json({ error: 'รายการสินค้าในตะกร้าไม่ถูกต้อง' }, { status: 400 })
    }

    const quantityByProductId = new Map<string, number>()
    for (const item of normalizedItems) {
      quantityByProductId.set(item.productId, (quantityByProductId.get(item.productId) ?? 0) + item.qty)
    }
    const saleItems = Array.from(quantityByProductId, ([productId, qty]) => ({ productId, qty }))

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const productIds = saleItems.map((item) => item.productId)
      const { rows: productRows } = await client.query<{
        id: string
        product_name: string
        cost: unknown
        cash_price: unknown
        grab_price: unknown
        line_man_price: unknown
        current_stock: unknown
        min_stock: unknown
      }>(
        `
          SELECT
            p.id,
            p.product_name,
            p.cost,
            p.cash_price,
            p.grab_price,
            p.line_man_price,
            bi.current_stock,
            bi.min_stock
          FROM branch_inventory bi
          JOIN products p ON p.id = bi.product_id
          WHERE bi.product_id = ANY($1::uuid[])
            AND bi.branch_id = $2::uuid
          FOR UPDATE OF bi
        `,
        [productIds, branchId],
      )

      const productsById = new Map(productRows.map((product) => [product.id, product]))

      for (const item of saleItems) {
        const product = productsById.get(item.productId)
        if (!product) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'ไม่พบสินค้าบางรายการในตะกร้า' }, { status: 404 })
        }
        if (toNumber(product.current_stock) < item.qty) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: `สต็อกไม่พอ: ${product.product_name}` }, { status: 400 })
        }
      }

      const gpRate = gpRateForChannel(channel)
      const insertedRows = []

      for (const item of saleItems) {
        const product = productsById.get(item.productId)
        if (!product) continue

        const unitPrice = channel === 'Grab'
          ? toNumber(product.grab_price)
          : channel === 'LINE MAN'
            ? toNumber(product.line_man_price)
            : toNumber(product.cash_price)
        const unitCost = toNumber(product.cost)
        const line = computeSaleLine(unitPrice, unitCost, item.qty, gpRate)

        const { rows } = await client.query(
          `
            INSERT INTO sales (
              branch_id,
              order_id,
              order_datetime,
              product_id,
              qty,
              channel,
              unit_price,
              gp_percent,
              gp_amount,
              net_revenue,
              unit_cost,
              total_cost,
              total_sales,
              net_profit,
              note
            )
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
          `,
          [
            branchId,
            orderId,
            item.productId,
            item.qty,
            channel,
            unitPrice,
            gpRate,
            line.gpAmount,
            line.netRevenue,
            unitCost,
            line.totalCost,
            line.totalSales,
            line.netProfit,
            note,
          ],
        )
        insertedRows.push(rows[0])

        const { rowCount } = await client.query(
          `
            UPDATE branch_inventory
            SET current_stock = current_stock - $2,
                stock_out = stock_out + $2,
                status = CASE
                  WHEN current_stock - $2 <= 0 THEN 'Out of Stock'
                  WHEN current_stock - $2 <= min_stock THEN 'Low Stock'
                  ELSE 'Active'
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = $1
              AND branch_id = $3
              AND current_stock >= $2
          `,
          [item.productId, item.qty, branchId],
        )

        if (!rowCount) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: `สต็อกไม่พอ: ${product.product_name}` }, { status: 400 })
        }

        // Sync aggregate stock cache on products from branch_inventory.
        await client.query(
          `
            UPDATE products
            SET total_current_stock = (
              SELECT COALESCE(SUM(bi.current_stock), 0)
              FROM branch_inventory bi
              WHERE bi.product_id = products.id
            ),
            total_stock_out = (
              SELECT COALESCE(SUM(bi.stock_out), 0)
              FROM branch_inventory bi
              WHERE bi.product_id = products.id
            ),
            aggregate_status = CASE
              WHEN (
                SELECT COALESCE(SUM(bi.current_stock), 0)
                FROM branch_inventory bi
                WHERE bi.product_id = products.id
              ) <= 0 THEN 'Out of Stock'
              WHEN (
                SELECT COALESCE(SUM(bi.current_stock), 0)
                FROM branch_inventory bi
                WHERE bi.product_id = products.id
              ) <= products.default_min_stock THEN 'Low Stock'
              ELSE 'Active'
            END,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [item.productId],
        )
      }

      await client.query('COMMIT')
      return NextResponse.json({ orderId, inserted: insertedRows.length }, { status: 201 })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23514') {
      return NextResponse.json({ error: 'จำนวนขายหรือสต็อกต้องไม่ติดลบ' }, { status: 400 })
    }
    console.error('POST /api/sales-history failed', error)
    return NextResponse.json({ error: 'Failed to save sale' }, { status: 500 })
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
    const branchId = session?.role === 'STAFF'
      ? toUuidParam(session.branchId)
      : toUuidParam(String(body.branchId ?? '').trim())

    if (orderIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกออเดอร์ที่ต้องการลบ' }, { status: 400 })
    }

    if (!branchId) {
      return NextResponse.json({ error: 'กรุณาเลือกสาขาก่อนลบประวัติการขาย' }, { status: 400 })
    }

    const uniqueOrderIds = Array.from(new Set(orderIds))

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `
          SELECT id
          FROM sales
          WHERE order_id = ANY($1::text[])
            AND branch_id = $2::uuid
          FOR UPDATE
        `,
        [uniqueOrderIds, branchId],
      )

      const { rows: matchedRows } = await client.query<{ order_id: string }>(
        `
          SELECT DISTINCT order_id
          FROM sales
          WHERE order_id = ANY($1::text[])
            AND branch_id = $2::uuid
        `,
        [uniqueOrderIds, branchId],
      )

      if (matchedRows.length !== uniqueOrderIds.length) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'พบรายการขายที่ไม่ได้อยู่ในสาขาที่เลือก หรือไม่มีอยู่ในระบบ' }, { status: 400 })
      }

      const { rows: restoreRows } = await client.query<{ product_id: string; qty: number; branch_id: string }>(
        `
          SELECT product_id, SUM(qty)::int AS qty, branch_id
          FROM sales
          WHERE order_id = ANY($1::text[])
            AND branch_id = $2::uuid
            AND product_id IS NOT NULL
          GROUP BY product_id, branch_id
        `,
        [uniqueOrderIds, branchId],
      )

      for (const row of restoreRows) {
        const restoreBranchId = row.branch_id
        if (restoreBranchId) {
          // Restore stock back to the branch that made the sale
          await client.query(
            `
              INSERT INTO branch_inventory (product_id, branch_id, current_stock, stock_in, stock_out, number_of_times_received, min_stock, status)
              VALUES ($1, $2, 0, 0, 0, 0, 0, 'Out of Stock')
              ON CONFLICT (product_id, branch_id) DO NOTHING
            `,
            [row.product_id, restoreBranchId],
          )

          await client.query(
            `
              UPDATE branch_inventory
              SET current_stock = current_stock + $2,
                  stock_out = GREATEST(stock_out - $2, 0),
                  status = CASE
                    WHEN current_stock + $2 <= 0 THEN 'Out of Stock'
                    WHEN current_stock + $2 <= min_stock THEN 'Low Stock'
                    ELSE 'Active'
                  END,
                  updated_at = CURRENT_TIMESTAMP
              WHERE product_id = $1 AND branch_id = $3
            `,
            [row.product_id, row.qty, restoreBranchId],
          )

          // Sync products table
          await client.query(
            `
              UPDATE products
              SET total_current_stock = (
                SELECT COALESCE(SUM(bi.current_stock), 0)
                FROM branch_inventory bi
                WHERE bi.product_id = products.id
              ),
              total_stock_out = (
                SELECT COALESCE(SUM(bi.stock_out), 0)
                FROM branch_inventory bi
                WHERE bi.product_id = products.id
              ),
              aggregate_status = CASE
                WHEN (
                  SELECT COALESCE(SUM(bi.current_stock), 0)
                  FROM branch_inventory bi
                  WHERE bi.product_id = products.id
                ) <= 0 THEN 'Out of Stock'
                WHEN (
                  SELECT COALESCE(SUM(bi.current_stock), 0)
                  FROM branch_inventory bi
                  WHERE bi.product_id = products.id
                ) <= products.default_min_stock THEN 'Low Stock'
                ELSE 'Active'
              END,
              updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
            `,
            [row.product_id],
          )
        }
      }

      const { rowCount } = await client.query(
        `
          DELETE FROM sales
          WHERE order_id = ANY($1::text[])
            AND branch_id = $2::uuid
        `,
        [uniqueOrderIds, branchId],
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

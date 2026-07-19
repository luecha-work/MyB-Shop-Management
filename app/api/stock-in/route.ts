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

const toPositiveInteger = (value: unknown) => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function POST(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const productId = toUuidParam(String(body.productId ?? '').trim())
    const quantity = toPositiveInteger(body.quantity)
    const note = String(body.note ?? '').trim() || null
    // STAFF always use their session branch; OWNER/ADMIN can pass a specific branchId
    const branchId = session.role === 'STAFF'
      ? toUuidParam(session.branchId)
      : (toUuidParam(String(body.branchId ?? '').trim()) || toUuidParam(session.branchId))

    if (!productId || quantity == null) {
      return NextResponse.json({ error: 'กรุณาเลือกสินค้าและระบุจำนวนรับเข้าให้ถูกต้อง' }, { status: 400 })
    }

    if (!branchId) {
      return NextResponse.json({ error: 'กรุณาเลือกสาขาที่ต้องการรับสินค้าเข้า' }, { status: 400 })
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Lock the branch_inventory row (or create one) to prevent race conditions
      const { rows: invRows } = await client.query<{ id: string, min_stock: number, current_stock: number }>(
        `
          INSERT INTO branch_inventory (product_id, branch_id, current_stock, stock_in, stock_out, number_of_times_received, min_stock, status)
          VALUES ($1, $2, 0, 0, 0, 0, 0, 'Out of Stock')
          ON CONFLICT (product_id, branch_id) DO NOTHING
          RETURNING id, min_stock, current_stock
        `,
        [productId, branchId],
      )

      // If the row already existed, lock it
      if (invRows.length === 0) {
        const { rows: existing } = await client.query<{ id: string, min_stock: number, current_stock: number }>(
          `SELECT id, min_stock, current_stock FROM branch_inventory WHERE product_id = $1 AND branch_id = $2 FOR UPDATE`,
          [productId, branchId],
        )
        if (existing.length === 0) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'ไม่พบสินค้าในสาขาที่เลือก' }, { status: 404 })
        }
        invRows.push(existing[0])
      }

      // Insert the stock_in history record
      const { rows } = await client.query(
        `
          INSERT INTO stock_in (
            branch_id,
            transaction_timestamp,
            product_id,
            quantity,
            restock,
            note
          )
          VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5)
          RETURNING id, transaction_timestamp, product_id, quantity, note
        `,
        [branchId, productId, quantity, String(quantity), note],
      )

      // Update branch_inventory (primary stock counter)
      await client.query(
        `
          UPDATE branch_inventory
          SET current_stock = current_stock + $2,
              stock_in = stock_in + $2,
              number_of_times_received = number_of_times_received + 1,
              status = CASE
                WHEN current_stock + $2 <= 0 THEN 'Out of Stock'
                WHEN current_stock + $2 <= min_stock THEN 'Low Stock'
                ELSE 'Active'
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $1 AND branch_id = $3
        `,
        [productId, quantity, branchId],
      )

      // Sync aggregate stock cache on products from branch_inventory.
      await client.query(
        `
          UPDATE products
          SET total_current_stock = (
            SELECT COALESCE(SUM(bi.current_stock), 0)
            FROM branch_inventory bi
            WHERE bi.product_id = products.id
          ),
          total_stock_in = (
            SELECT COALESCE(SUM(bi.stock_in), 0)
            FROM branch_inventory bi
            WHERE bi.product_id = products.id
          ),
          total_number_of_times_received = (
            SELECT COALESCE(SUM(bi.number_of_times_received), 0)
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
        [productId],
      )

      await client.query('COMMIT')
      return NextResponse.json({
        row: {
          id: rows[0].id,
          date: rows[0].transaction_timestamp,
          productId: rows[0].product_id || '',
          qty: toNumber(rows[0].quantity),
          note: rows[0].note || '',
        },
      }, { status: 201 })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23514') {
      return NextResponse.json({ error: 'จำนวนรับเข้าต้องไม่ติดลบ' }, { status: 400 })
    }
    console.error('POST /api/stock-in failed', error)
    return NextResponse.json({ error: 'Failed to save stock-in record' }, { status: 500 })
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

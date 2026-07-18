import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db, toNumber } from '@/lib/db'
import { canManageSettings, sessionFromRequest } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        product_code,
        product_name,
        cost,
        cash_price,
        grab_price,
        line_man_price,
        current_stock,
        stock_in,
        min_stock,
        status,
        image_url
      FROM products
      ORDER BY product_name ASC
    `)

    return NextResponse.json({
      products: rows.map((row) => ({
        id: row.id,
        productCode: row.product_code,
        name: row.product_name,
        cost: toNumber(row.cost),
        priceCash: toNumber(row.cash_price),
        priceGrab: toNumber(row.grab_price),
        priceLineman: toNumber(row.line_man_price),
        currentStock: toNumber(row.current_stock),
        stockIn: toNumber(row.stock_in),
        minStock: toNumber(row.min_stock),
        status: row.status || 'Active',
        image: row.image_url || '',
      })),
    })
  } catch (error) {
    console.error('GET /api/products failed', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (!canManageSettings(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const action = String(body.action ?? '')
    const id = String(body.id ?? '').trim()
    const imageUrl = String(body.imageUrl ?? '').trim()

    if (action !== 'update-image') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }

    if (!id || !imageUrl) {
      return NextResponse.json({ error: 'กรุณาระบุสินค้าและ URL รูปภาพ' }, { status: 400 })
    }

    const { rows } = await db.query(
      `
        UPDATE products
        SET image_url = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, image_url
      `,
      [id, imageUrl],
    )

    if (!rows[0]) {
      return NextResponse.json({ error: 'ไม่พบสินค้าที่ต้องการแก้ไขรูปภาพ' }, { status: 404 })
    }

    return NextResponse.json({
      product: {
        id: rows[0].id,
        image: rows[0].image_url,
      },
    })
  } catch (error) {
    console.error('PATCH /api/products failed', error)
    return NextResponse.json({ error: 'Failed to update product image' }, { status: 500 })
  }
}

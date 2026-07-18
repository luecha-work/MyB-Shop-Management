import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db, toNumber } from '@/lib/db'
import { canManageSettings, sessionFromRequest } from '@/lib/auth/session'

export const runtime = 'nodejs'

const toProductResponse = (row: {
  id: string
  product_code: string | null
  product_name: string
  cost: unknown
  cash_price: unknown
  grab_price: unknown
  line_man_price: unknown
  current_stock: unknown
  stock_in: unknown
  min_stock: unknown
  status: string | null
  image_url: string | null
}) => ({
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
})

const toNonNegativeNumber = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const toNonNegativeInteger = (value: unknown) => {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : null
}

const productSelect = `
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
`

export async function GET() {
  try {
    const { rows } = await db.query(`
      SELECT
        ${productSelect}
      FROM products
      ORDER BY product_name ASC
    `)

    return NextResponse.json({
      products: rows.map(toProductResponse),
    })
  } catch (error) {
    console.error('GET /api/products failed', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (!canManageSettings(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const name = String(body.name ?? '').trim()
    const cost = toNonNegativeNumber(body.cost)
    const priceCash = toNonNegativeNumber(body.priceCash)
    const priceGrab = toNonNegativeNumber(body.priceGrab)
    const priceLineman = toNonNegativeNumber(body.priceLineman)
    const stockIn = toNonNegativeInteger(body.stockIn)
    const minStock = toNonNegativeInteger(body.minStock)
    const imageUrl = String(body.imageUrl ?? '').trim() || null

    if (!name || cost == null || priceCash == null || priceGrab == null || priceLineman == null || stockIn == null || minStock == null) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วนและถูกต้อง' }, { status: 400 })
    }

    const { rows } = await db.query(
      `
        INSERT INTO products (
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $6, $7, 'Active', $8)
        RETURNING ${productSelect}
      `,
      [name, cost, priceCash, priceGrab, priceLineman, stockIn, minStock, imageUrl],
    )

    return NextResponse.json({ product: toProductResponse(rows[0]) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/products failed', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
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

    if (action === 'update-product') {
      const name = String(body.name ?? '').trim()
      const cost = toNonNegativeNumber(body.cost)
      const priceCash = toNonNegativeNumber(body.priceCash)
      const priceGrab = toNonNegativeNumber(body.priceGrab)
      const priceLineman = toNonNegativeNumber(body.priceLineman)
      const stockIn = toNonNegativeInteger(body.stockIn)
      const minStock = toNonNegativeInteger(body.minStock)
      const imageUrl = String(body.imageUrl ?? '').trim() || null

      if (!id) {
        return NextResponse.json({ error: 'กรุณาเลือกสินค้าที่ต้องการแก้ไข' }, { status: 400 })
      }

      if (!name || cost == null || priceCash == null || priceGrab == null || priceLineman == null || stockIn == null || minStock == null) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วนและถูกต้อง' }, { status: 400 })
      }

      const { rows } = await db.query(
        `
          UPDATE products
          SET product_name = $2,
              cost = $3,
              cash_price = $4,
              grab_price = $5,
              line_man_price = $6,
              stock_in = $7,
              min_stock = $8,
              image_url = $9,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING ${productSelect}
        `,
        [id, name, cost, priceCash, priceGrab, priceLineman, stockIn, minStock, imageUrl],
      )

      if (!rows[0]) {
        return NextResponse.json({ error: 'ไม่พบสินค้าที่ต้องการแก้ไข' }, { status: 404 })
      }

      return NextResponse.json({ product: toProductResponse(rows[0]) })
    }

    if (action !== 'update-image') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }

    const imageUrl = String(body.imageUrl ?? '').trim()
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

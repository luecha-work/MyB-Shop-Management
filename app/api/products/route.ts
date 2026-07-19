import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db, toNumber } from '@/lib/db'
import { canManageSettings, sessionFromRequest } from '@/lib/auth/session'

export const runtime = 'nodejs'

const PRODUCT_IMAGE_BUCKET = 'images'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

const nextProductCodeQuery = `
  SELECT (
    COALESCE(
      MAX(product_code::int) FILTER (WHERE product_code ~ '^[0-9]+$'),
      0
    ) + 1
  )::text AS product_code
  FROM products
`

const storageClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Storage environment variables are not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

const storagePathFromPublicUrl = (imageUrl: string | null) => {
  if (!imageUrl || !supabaseUrl) return null

  try {
    const url = new URL(imageUrl)
    const storageUrl = new URL(supabaseUrl)
    if (url.host !== storageUrl.host) return null

    const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return null

    const path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    return path.startsWith('products/') ? path : null
  } catch {
    return null
  }
}

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
        WITH next_code AS (
          ${nextProductCodeQuery}
        )
        INSERT INTO products (
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
        )
        SELECT next_code.product_code, $1, $2, $3, $4, $5, $6, $6, $7, 'Active', $8
        FROM next_code
        RETURNING ${productSelect}
      `,
      [name, cost, priceCash, priceGrab, priceLineman, stockIn, minStock, imageUrl],
    )

    return NextResponse.json({ product: toProductResponse(rows[0]) }, { status: 201 })
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23514') {
      return NextResponse.json({ error: 'จำนวนสต็อกและราคาต้องไม่ติดลบ' }, { status: 400 })
    }
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
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23514') {
      return NextResponse.json({ error: 'จำนวนสต็อกและราคาต้องไม่ติดลบ' }, { status: 400 })
    }
    console.error('PATCH /api/products failed', error)
    return NextResponse.json({ error: 'Failed to update product image' }, { status: 500 })
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
      return NextResponse.json({ error: 'กรุณาเลือกสินค้าที่ต้องการลบ' }, { status: 400 })
    }

    const { rows: imageRows } = await db.query<{ image_url: string | null }>(
      `
        SELECT image_url
        FROM products
        WHERE id = ANY($1::uuid[])
      `,
      [ids],
    )

    const storagePaths = Array.from(
      new Set(
        imageRows
          .map((row) => storagePathFromPublicUrl(row.image_url))
          .filter((path): path is string => Boolean(path)),
      ),
    )

    if (storagePaths.length > 0) {
      const { error } = await storageClient()
        .storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove(storagePaths)

      if (error) {
        return NextResponse.json({ error: error.message || 'ลบไฟล์รูปภาพสินค้าไม่สำเร็จ' }, { status: 500 })
      }
    }

    const { rowCount } = await db.query(
      `
        DELETE FROM products
        WHERE id = ANY($1::uuid[])
      `,
      [ids],
    )

    return NextResponse.json({ deleted: rowCount ?? 0, deletedImages: storagePaths.length })
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '22P02') {
      return NextResponse.json({ error: 'รายการสินค้าที่เลือกไม่ถูกต้อง' }, { status: 400 })
    }
    console.error('DELETE /api/products failed', error)
    return NextResponse.json({ error: 'Failed to delete products' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db, toNumber, toUuidParam } from '@/lib/db'
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
  total_current_stock AS current_stock,
  total_stock_in AS stock_in,
  default_min_stock AS min_stock,
  aggregate_status AS status,
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

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request)
  const action = request.nextUrl.searchParams.get('action')?.trim()

  if (action === 'import-candidates') {
    if (!canManageSettings(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sourceBranchId = toUuidParam(request.nextUrl.searchParams.get('sourceBranchId')?.trim())
    const targetBranchId = toUuidParam(request.nextUrl.searchParams.get('targetBranchId')?.trim())

    if (!sourceBranchId || !targetBranchId || sourceBranchId === targetBranchId) {
      return NextResponse.json({ error: 'กรุณาเลือกสาขาต้นทางและปลายทางให้ถูกต้อง' }, { status: 400 })
    }

    try {
      const { rows } = await db.query(
        `
          SELECT
            p.id,
            p.product_code,
            p.product_name,
            p.cost,
            p.cash_price,
            p.grab_price,
            p.line_man_price,
            bi.current_stock,
            bi.stock_in,
            bi.min_stock,
            bi.status,
            p.image_url
          FROM branch_inventory bi
          JOIN products p ON p.id = bi.product_id
          WHERE bi.branch_id = $1::uuid
          ORDER BY p.product_name ASC
        `,
        [sourceBranchId],
      )

      return NextResponse.json({ products: rows.map(toProductResponse) })
    } catch (error) {
      console.error('GET /api/products import-candidates failed', error)
      return NextResponse.json({ error: 'Failed to load import products' }, { status: 500 })
    }
  }

  // STAFF always see their own branch; OWNER/ADMIN must pass ?branchId=.
  const branchId = session?.role === 'STAFF'
    ? toUuidParam(session.branchId)
    : toUuidParam(request.nextUrl.searchParams.get('branchId')?.trim())

  if (!branchId) {
    return NextResponse.json({ error: 'กรุณาเลือกสาขา' }, { status: 400 })
  }

  try {
    const { rows } = await db.query(
      `
        SELECT
          p.id,
          p.product_code,
          p.product_name,
          p.cost,
          p.cash_price,
          p.grab_price,
          p.line_man_price,
          COALESCE(bi.current_stock, 0) AS current_stock,
          COALESCE(bi.stock_in, 0) AS stock_in,
          COALESCE(bi.min_stock, p.default_min_stock) AS min_stock,
          COALESCE(bi.status, 'Out of Stock') AS status,
          p.image_url
        FROM products p
        LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = $1::uuid
        ORDER BY p.product_name ASC
      `,
      [branchId],
    )

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
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const branchId = session.role === 'STAFF'
      ? toUuidParam(session.branchId)
      : toUuidParam(String(body.branchId ?? '').trim())

    if (!name || cost == null || priceCash == null || priceGrab == null || priceLineman == null || stockIn == null || minStock == null) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วนและถูกต้อง' }, { status: 400 })
    }

    if (!branchId) {
      return NextResponse.json({ error: 'กรุณาเลือกสาขาที่ต้องการลงสินค้า' }, { status: 400 })
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const { rowCount: branchCount } = await client.query(
        `
          SELECT 1
          FROM branches
          WHERE id = $1::uuid
            AND status = 'active'
        `,
        [branchId],
      )

      if (!branchCount) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'ไม่พบสาขาที่เลือก หรือสาขาไม่ได้เปิดใช้งาน' }, { status: 400 })
      }

      const { rows } = await client.query(
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
            total_current_stock,
            total_stock_in,
            default_min_stock,
            aggregate_status,
            image_url
          )
          SELECT
            next_code.product_code,
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $6,
            $7,
            CASE
              WHEN $6 <= 0 THEN 'Out of Stock'
              WHEN $6 <= $7 THEN 'Low Stock'
              ELSE 'Active'
            END,
            $8
          FROM next_code
          RETURNING ${productSelect}
        `,
        [name, cost, priceCash, priceGrab, priceLineman, stockIn, minStock, imageUrl],
      )

      const newProduct = rows[0]

      // Create initial stock only in the selected/current branch.
      await client.query(
        `
          INSERT INTO branch_inventory (
            product_id,
            branch_id,
            current_stock,
            stock_in,
            stock_out,
            number_of_times_received,
            min_stock,
            status
          )
          VALUES (
            $1::uuid,
            $4::uuid,
            $2,
            $2,
            0,
            CASE WHEN $2 > 0 THEN 1 ELSE 0 END,
            $3,
            CASE
              WHEN $2 <= 0 THEN 'Out of Stock'
              WHEN $2 <= $3 THEN 'Low Stock'
              ELSE 'Active'
            END
          )
        `,
        [newProduct.id, stockIn, minStock, branchId],
      )

      await client.query('COMMIT')
      return NextResponse.json({ product: toProductResponse(newProduct) }, { status: 201 })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
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

    if (action === 'import-products') {
      const sourceBranchId = toUuidParam(String(body.sourceBranchId ?? '').trim())
      const targetBranchId = toUuidParam(String(body.targetBranchId ?? '').trim())
      const mode = String(body.mode ?? 'copy')
      const productIds: string[] = Array.isArray(body.productIds)
        ? body.productIds.map((productId: unknown) => String(productId).trim()).filter(Boolean)
        : []

      if (!sourceBranchId || !targetBranchId || sourceBranchId === targetBranchId) {
        return NextResponse.json({ error: 'กรุณาเลือกสาขาต้นทางและปลายทางให้ถูกต้อง' }, { status: 400 })
      }

      if (mode !== 'copy' && mode !== 'reset') {
        return NextResponse.json({ error: 'กรุณาเลือกวิธีนำเข้าสินค้าให้ถูกต้อง' }, { status: 400 })
      }

      if (productIds.length === 0) {
        return NextResponse.json({ error: 'กรุณาเลือกสินค้าที่ต้องการ import' }, { status: 400 })
      }

      const client = await db.connect()
      try {
        await client.query('BEGIN')

        const { rows } = await client.query<{ product_id: string }>(
          `
            WITH source_rows AS (
              SELECT
                bi.product_id,
                CASE WHEN $4 = 'copy' THEN bi.current_stock ELSE 0 END AS current_stock,
                CASE WHEN $4 = 'copy' THEN bi.stock_in ELSE 0 END AS stock_in,
                CASE WHEN $4 = 'copy' THEN bi.stock_out ELSE 0 END AS stock_out,
                CASE WHEN $4 = 'copy' THEN bi.number_of_times_received ELSE 0 END AS number_of_times_received,
                bi.min_stock,
                CASE
                  WHEN $4 = 'copy' THEN bi.status
                  ELSE 'Out of Stock'
                END AS status
              FROM branch_inventory bi
              WHERE bi.branch_id = $1::uuid
                AND bi.product_id = ANY($3::uuid[])
            ),
            upserted AS (
              INSERT INTO branch_inventory (
                product_id,
                branch_id,
                current_stock,
                stock_in,
                stock_out,
                number_of_times_received,
                min_stock,
                status
              )
              SELECT
                product_id,
                $2::uuid,
                current_stock,
                stock_in,
                stock_out,
                number_of_times_received,
                min_stock,
                status
              FROM source_rows
              ON CONFLICT (product_id, branch_id) DO UPDATE
              SET current_stock = EXCLUDED.current_stock,
                  stock_in = EXCLUDED.stock_in,
                  stock_out = EXCLUDED.stock_out,
                  number_of_times_received = EXCLUDED.number_of_times_received,
                  min_stock = EXCLUDED.min_stock,
                  status = EXCLUDED.status,
                  updated_at = CURRENT_TIMESTAMP
              RETURNING product_id
            )
            SELECT product_id FROM upserted
          `,
          [sourceBranchId, targetBranchId, productIds, mode],
        )

        const importedIds = rows.map((row) => row.product_id)

        if (importedIds.length > 0) {
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
              total_stock_out = (
                SELECT COALESCE(SUM(bi.stock_out), 0)
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
              WHERE id = ANY($1::uuid[])
            `,
            [importedIds],
          )
        }

        await client.query('COMMIT')
        return NextResponse.json({ importedCount: importedIds.length })
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }

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
              default_min_stock = $7,
              image_url = $8,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING ${productSelect}
        `,
        [id, name, cost, priceCash, priceGrab, priceLineman, minStock, imageUrl],
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

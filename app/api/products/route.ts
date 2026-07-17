import { NextResponse } from 'next/server'
import { db, toNumber } from '@/lib/db'

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

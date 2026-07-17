import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { canManageSettings, decodeSessionToken } from '@/lib/auth/session'

export const runtime = 'nodejs'

const sessionFromRequest = (request: NextRequest) =>
  decodeSessionToken(
    request.cookies.get('access_token')?.value ??
      request.cookies.get('refresh_token')?.value ??
      request.cookies.get('auth_session')?.value,
  )

export async function GET(request: NextRequest) {
  if (!canManageSettings(sessionFromRequest(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { rows } = await db.query(`
      SELECT id, branch_code, branch_name, address, phone, status
      FROM branches
      ORDER BY branch_name ASC
    `)

    return NextResponse.json({
      branches: rows.map((row) => ({
        id: row.id,
        branchCode: row.branch_code,
        branchName: row.branch_name,
        address: row.address || '',
        phone: row.phone || '',
        status: row.status,
      })),
    })
  } catch (error) {
    console.error('GET /api/branches failed', error)
    return NextResponse.json({ error: 'Failed to load branches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!canManageSettings(sessionFromRequest(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const branchCode = String(body.branchCode ?? '').trim()
    const branchName = String(body.branchName ?? '').trim()
    const address = String(body.address ?? '').trim() || null
    const phone = String(body.phone ?? '').trim() || null
    const status = String(body.status ?? 'active').trim() || 'active'

    if (!branchCode || !branchName) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสสาขาและชื่อสาขา' }, { status: 400 })
    }

    const { rows } = await db.query(
      `
        INSERT INTO branches (branch_code, branch_name, address, phone, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, branch_code, branch_name, address, phone, status
      `,
      [branchCode, branchName, address, phone, status],
    )

    return NextResponse.json({ branch: rows[0] }, { status: 201 })
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23505') {
      return NextResponse.json({ error: 'รหัสสาขานี้มีอยู่แล้ว' }, { status: 409 })
    }
    console.error('POST /api/branches failed', error)
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 })
  }
}

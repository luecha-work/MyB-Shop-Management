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
    const [roles, branches] = await Promise.all([
      db.query('SELECT id, role_name, description FROM roles ORDER BY role_name ASC'),
      db.query(`
        SELECT id, branch_code, branch_name
        FROM branches
        WHERE status = 'active'
        ORDER BY branch_name ASC
      `),
    ])

    return NextResponse.json({
      roles: roles.rows.map((row) => ({
        id: row.id,
        roleName: row.role_name,
        description: row.description || '',
      })),
      branches: branches.rows.map((row) => ({
        id: row.id,
        branchCode: row.branch_code,
        branchName: row.branch_name,
      })),
    })
  } catch (error) {
    console.error('GET /api/users failed', error)
    return NextResponse.json({ error: 'Failed to load user form data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!canManageSettings(sessionFromRequest(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const firstName = String(body.firstName ?? '').trim()
    const lastName = String(body.lastName ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const roleId = String(body.roleId ?? '').trim()
    const branchId = String(body.branchId ?? '').trim() || null
    const status = String(body.status ?? 'active').trim() || 'active'

    if (!firstName || !lastName || !email || !password || !roleId) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วน' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 })
    }

    const roleResult = await db.query('SELECT role_name FROM roles WHERE id = $1 LIMIT 1', [roleId])
    const roleName = String(roleResult.rows[0]?.role_name ?? '')
    if (!roleName) {
      return NextResponse.json({ error: 'ไม่พบบทบาทผู้ใช้ที่เลือก' }, { status: 400 })
    }
    if (roleName === 'staff' && !branchId) {
      return NextResponse.json({ error: 'ผู้ใช้ STAFF ต้องเลือกสาขาประจำ' }, { status: 400 })
    }

    const { rows } = await db.query(
      `
        INSERT INTO users (first_name, last_name, email, password_hash, role_id, branch_id, status)
        VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), $5, $6, $7)
        RETURNING id, first_name, last_name, email, role_id, branch_id, status
      `,
      [firstName, lastName, email, password, roleId, branchId, status],
    )

    return NextResponse.json({ user: rows[0] }, { status: 201 })
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23505') {
      return NextResponse.json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว' }, { status: 409 })
    }
    console.error('POST /api/users failed', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

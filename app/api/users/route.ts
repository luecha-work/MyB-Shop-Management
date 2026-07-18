import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { canManageSettings, sessionFromRequest } from '@/lib/auth/session'

export const runtime = 'nodejs'

const generateTemporaryPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = randomBytes(14)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request)
  if (!canManageSettings(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [users, roles, branches] = await Promise.all([
      db.query(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.status,
          u.branch_id,
          b.branch_code,
          b.branch_name,
          r.id AS role_id,
          r.role_name
        FROM users u
        JOIN roles r ON r.id = u.role_id
        LEFT JOIN branches b ON b.id = u.branch_id
        ORDER BY u.created_at DESC, u.first_name ASC
      `),
      db.query('SELECT id, role_name, description FROM roles ORDER BY role_name ASC'),
      db.query(`
        SELECT id, branch_code, branch_name
        FROM branches
        WHERE status = 'active'
        ORDER BY branch_name ASC
      `),
    ])

    return NextResponse.json({
      users: users.rows.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        name: `${row.first_name} ${row.last_name}`.trim(),
        email: row.email,
        status: row.status,
        roleId: row.role_id,
        roleName: row.role_name,
        branchId: row.branch_id,
        branchCode: row.branch_code || '',
        branchName: row.branch_name || '',
        isCurrentUser: row.id === session?.userId,
      })),
      currentUserId: session?.userId,
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
    const suppliedPassword = String(body.password ?? '').trim()
    const roleId = String(body.roleId ?? '').trim()
    const branchId = String(body.branchId ?? '').trim() || null
    const status = String(body.status ?? 'active').trim() || 'active'

    if (!firstName || !lastName || !email || !roleId) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วน' }, { status: 400 })
    }

    const roleResult = await db.query('SELECT role_name FROM roles WHERE id = $1 LIMIT 1', [roleId])
    const roleName = String(roleResult.rows[0]?.role_name ?? '')
    if (!roleName) {
      return NextResponse.json({ error: 'ไม่พบบทบาทผู้ใช้ที่เลือก' }, { status: 400 })
    }
    if (roleName === 'staff' && !branchId) {
      return NextResponse.json({ error: 'ผู้ใช้ STAFF ต้องเลือกสาขาประจำ' }, { status: 400 })
    }

    const temporaryPassword = suppliedPassword || generateTemporaryPassword()
    const { rows } = await db.query(
      `
        INSERT INTO users (first_name, last_name, email, password_hash, role_id, branch_id, status)
        VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), $5, $6, $7)
        RETURNING id, first_name, last_name, email, role_id, branch_id, status
      `,
      [firstName, lastName, email, temporaryPassword, roleId, branchId, status],
    )

    return NextResponse.json({ user: rows[0], temporaryPassword }, { status: 201 })
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23505') {
      return NextResponse.json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว' }, { status: 409 })
    }
    console.error('POST /api/users failed', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  if (!canManageSettings(sessionFromRequest(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const action = String(body.action ?? 'reset-password')
    const userId = String(body.userId ?? '').trim()

    if (action === 'update-user') {
      const firstName = String(body.firstName ?? '').trim()
      const lastName = String(body.lastName ?? '').trim()
      const email = String(body.email ?? '').trim().toLowerCase()
      const roleId = String(body.roleId ?? '').trim()
      const branchId = String(body.branchId ?? '').trim() || null
      const status = String(body.status ?? 'active').trim() || 'active'

      if (!userId) {
        return NextResponse.json({ error: 'กรุณาเลือกผู้ใช้ที่ต้องการแก้ไข' }, { status: 400 })
      }

      if (!firstName || !lastName || !email || !roleId) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วน' }, { status: 400 })
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
          UPDATE users
          SET first_name = $2,
              last_name = $3,
              email = $4,
              role_id = $5,
              branch_id = $6,
              status = $7,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id, first_name, last_name, email, role_id, branch_id, status
        `,
        [userId, firstName, lastName, email, roleId, branchId, status],
      )

      if (!rows[0]) {
        return NextResponse.json({ error: 'ไม่พบผู้ใช้ที่ต้องการแก้ไข' }, { status: 404 })
      }

      return NextResponse.json({ user: rows[0] })
    }

    if (!userId) {
      return NextResponse.json({ error: 'กรุณาเลือกผู้ใช้ที่ต้องการ reset password' }, { status: 400 })
    }

    const temporaryPassword = generateTemporaryPassword()
    const { rows } = await db.query(
      `
        UPDATE users
        SET password_hash = crypt($2, gen_salt('bf')),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email, first_name, last_name
      `,
      [userId, temporaryPassword],
    )

    if (!rows[0]) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ที่ต้องการ reset password' }, { status: 404 })
    }

    return NextResponse.json({
      user: rows[0],
      temporaryPassword,
    })
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23505') {
      return NextResponse.json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว' }, { status: 409 })
    }
    console.error('PATCH /api/users failed', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = sessionFromRequest(request)
  if (!canManageSettings(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map((id: unknown) => String(id)).filter(Boolean) : []

    const targetIds = ids.filter((id: string) => id !== session?.userId)
    if (targetIds.length === 0) {
      if (ids.includes(session?.userId ?? '')) {
        return NextResponse.json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' }, { status: 400 })
      }
      return NextResponse.json({ error: 'กรุณาเลือกผู้ใช้ที่ต้องการลบ' }, { status: 400 })
    }

    const { rowCount } = await db.query(
      `
        DELETE FROM users
        WHERE id = ANY($1::uuid[])
      `,
      [targetIds],
    )

    return NextResponse.json({
      deletedCount: rowCount ?? 0,
      skippedSelf: targetIds.length !== ids.length,
    })
  } catch (error) {
    console.error('DELETE /api/users failed', error)
    return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 })
  }
}

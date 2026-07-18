import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { canManageSettings, sessionFromRequest } from '@/lib/auth/session'

export const runtime = 'nodejs'

type BranchRecord = {
  id: string
  branch_code: string
  branch_name: string
  address: string | null
  phone: string | null
  status: string
}

type BranchUserRecord = {
  id: string
  first_name: string
  last_name: string
  email: string
  status: string
  branch_id: string
  role_name: string
}

const toBranchResponse = (branch: BranchRecord, users: BranchUserRecord[] = []) => ({
  id: branch.id,
  branchCode: branch.branch_code,
  branchName: branch.branch_name,
  address: branch.address || '',
  phone: branch.phone || '',
  status: branch.status,
  users: users.map((user) => ({
    id: user.id,
    name: `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    roleName: user.role_name,
    status: user.status,
  })),
})

export async function GET(request: NextRequest) {
  if (!canManageSettings(sessionFromRequest(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const branchId = request.nextUrl.searchParams.get('id')?.trim()

    if (branchId) {
      const { rows: branchRows } = await db.query<BranchRecord>(
        `
          SELECT id, branch_code, branch_name, address, phone, status
          FROM branches
          WHERE id = $1
        `,
        [branchId],
      )

      if (branchRows.length === 0) {
        return NextResponse.json({ error: 'ไม่พบสาขาที่ต้องการดู' }, { status: 404 })
      }

      const { rows: userRows } = await db.query<BranchUserRecord>(
        `
          SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.status,
            u.branch_id,
            r.role_name
          FROM users u
          JOIN roles r ON r.id = u.role_id
          WHERE u.branch_id = $1
          ORDER BY u.first_name ASC, u.last_name ASC, u.email ASC
        `,
        [branchId],
      )

      return NextResponse.json({ branch: toBranchResponse(branchRows[0], userRows) })
    }

    const { rows: branchRows } = await db.query<BranchRecord>(`
      SELECT id, branch_code, branch_name, address, phone, status
      FROM branches
      ORDER BY branch_name ASC
    `)

    const { rows: userRows } = await db.query<BranchUserRecord>(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.status,
        u.branch_id,
        r.role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.branch_id IS NOT NULL
      ORDER BY u.first_name ASC, u.last_name ASC, u.email ASC
    `)

    const usersByBranch = new Map<string, typeof userRows>()
    userRows.forEach((row) => {
      const branchUsers = usersByBranch.get(row.branch_id) ?? []
      branchUsers.push(row)
      usersByBranch.set(row.branch_id, branchUsers)
    })

    return NextResponse.json({
      branches: branchRows.map((row) => toBranchResponse(row, usersByBranch.get(row.id) ?? [])),
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

export async function PATCH(request: NextRequest) {
  if (!canManageSettings(sessionFromRequest(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const id = String(body.id ?? '').trim()
    const branchCode = String(body.branchCode ?? '').trim()
    const branchName = String(body.branchName ?? '').trim()
    const address = String(body.address ?? '').trim() || null
    const phone = String(body.phone ?? '').trim() || null
    const status = String(body.status ?? 'active').trim() || 'active'

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบสาขาที่ต้องการแก้ไข' }, { status: 400 })
    }

    if (!branchCode || !branchName) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสสาขาและชื่อสาขา' }, { status: 400 })
    }

    const { rows } = await db.query(
      `
        UPDATE branches
        SET branch_code = $2,
            branch_name = $3,
            address = $4,
            phone = $5,
            status = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, branch_code, branch_name, address, phone, status
      `,
      [id, branchCode, branchName, address, phone, status],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบสาขาที่ต้องการแก้ไข' }, { status: 404 })
    }

    return NextResponse.json({ branch: rows[0] })
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23505') {
      return NextResponse.json({ error: 'รหัสสาขานี้มีอยู่แล้ว' }, { status: 409 })
    }
    console.error('PATCH /api/branches failed', error)
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!canManageSettings(sessionFromRequest(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map((id: unknown) => String(id)).filter(Boolean) : []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกสาขาที่ต้องการลบ' }, { status: 400 })
    }

    const { rowCount } = await db.query(
      `
        DELETE FROM branches
        WHERE id = ANY($1::uuid[])
      `,
      [ids],
    )

    return NextResponse.json({ deletedCount: rowCount ?? 0 })
  } catch (error) {
    const code = typeof error === 'object' && error != null && 'code' in error ? String(error.code) : ''
    if (code === '23503') {
      return NextResponse.json({ error: 'ไม่สามารถลบสาขาที่มีผู้ใช้หรือรายการธุรกรรมผูกอยู่ได้' }, { status: 409 })
    }
    console.error('DELETE /api/branches failed', error)
    return NextResponse.json({ error: 'Failed to delete branches' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessionFromRequest } from '@/lib/auth/session'

export const runtime = 'nodejs'

type ProfileRow = {
  first_name: string
  last_name: string
  email: string
  status: string
  role_name: string
  branch_code: string | null
  branch_name: string | null
}

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rows } = await db.query<ProfileRow>(
      `
        SELECT
          u.first_name,
          u.last_name,
          u.email,
          u.status,
          r.role_name,
          b.branch_code,
          b.branch_name
        FROM users u
        JOIN roles r ON r.id = u.role_id
        LEFT JOIN branches b ON b.id = u.branch_id
        WHERE u.id = $1
        LIMIT 1
      `,
      [session.userId],
    )

    const profile = rows[0]
    if (!profile) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้' }, { status: 404 })
    }

    return NextResponse.json({
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      role: profile.role_name.toUpperCase(),
      branchCode: profile.branch_code || '',
      branchName: profile.branch_name || '',
      status: profile.status,
    })
  } catch (error) {
    console.error('GET /api/profile failed', error)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

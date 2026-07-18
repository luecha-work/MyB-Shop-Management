'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { decodeSessionToken, type Session } from '@/lib/auth/session'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'

type LoginState = { error?: string } | null | undefined

const ACCESS_TOKEN_MAX_AGE = 60 * 60 // 1 hour
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 // 24 hours

type LoginUserRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  role_name: string
  branch_id: string | null
  branch_name: string | null
}

const normalizeRole = (roleName: string): Session['role'] => {
  const role = roleName.toUpperCase()
  if (role === 'OWNER' || role === 'ADMIN' || role === 'STAFF') return role
  return 'STAFF'
}

export async function login(_prevState: LoginState, formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'กรุณากรอกอีเมลและรหัสผ่าน' }
  }

  let session: Session | null = null

  try {
    const { rows } = await db.query<LoginUserRow>(
      `
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          r.role_name,
          u.branch_id,
          b.branch_name
        FROM users u
        JOIN roles r ON r.id = u.role_id
        LEFT JOIN branches b ON b.id = u.branch_id
        WHERE LOWER(u.email) = LOWER($1)
          AND u.status = 'active'
          AND u.password_hash = crypt($2, u.password_hash)
        LIMIT 1
      `,
      [email, password],
    )

    const user = rows[0]
    if (!user) {
      return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
    }

    session = {
      userId: user.id,
      role: normalizeRole(user.role_name),
      name: `${user.first_name} ${user.last_name}`.trim(),
      email: user.email,
      branchId: user.branch_id,
      branchName: user.branch_name,
    }

    const cookieStore = await cookies()
    const [accessTokenValue, refreshTokenValue] = await Promise.all([
      signAccessToken(session),
      signRefreshToken(session),
    ])
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax' as const,
    }
    cookieStore.set('access_token', accessTokenValue, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    })
    cookieStore.set('refresh_token', refreshTokenValue, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    })
    cookieStore.delete('auth_session')
  } catch (error) {
    console.error('Login failed', error)
    return { error: 'ไม่สามารถเชื่อมต่อฐานข้อมูลเพื่อเข้าสู่ระบบได้' }
  }

  redirect(session.role === 'STAFF' ? '/pos' : '/dashboard')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
  cookieStore.delete('auth_session')
  redirect('/login')
}

export async function getSession() {
  const cookieStore = await cookies()
  const token =
    cookieStore.get('access_token') ??
    cookieStore.get('refresh_token') ??
    cookieStore.get('auth_session')

  if (token) return decodeSessionToken(token.value)
  return null
}

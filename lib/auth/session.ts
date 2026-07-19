import { verifyToken } from './jwt'

export type Session = {
  userId: string
  role: 'OWNER' | 'ADMIN' | 'STAFF'
  name: string
  email: string
  branchId: string | null
  branchName: string | null
}

const isJwt = (value: string): boolean =>
  value.split('.').length === 3 && value.startsWith('eyJ')

const sessionFromPayload = (payload: Record<string, unknown>): Session | null => {
  if (!payload?.userId) return null
  const role = String(payload.role ?? '').toUpperCase()
  return {
    userId: String(payload.userId),
    role: (['OWNER', 'ADMIN', 'STAFF'].includes(role) ? role : 'STAFF') as Session['role'],
    name: String(payload.name ?? ''),
    email: String(payload.email ?? ''),
    branchId: payload.branchId ? String(payload.branchId) : null,
    branchName: payload.branchName ? String(payload.branchName) : null,
  }
}

export const decodeSessionToken = async (value: string | undefined): Promise<Session | null> => {
  if (!value) return null

  // If it looks like a JWT, verify signature first
  if (isJwt(value)) {
    const payload = await verifyToken(value)
    const session = sessionFromPayload(payload as Record<string, unknown>)
    if (session) return session
  }

  // Legacy fallback: JSON.parse for auth_session / old cookies during migration
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    if (parsed && parsed.userId) return sessionFromPayload(parsed)
    return null
  } catch {
    return null
  }
}

export const canManageSettings = (session: Session | null) =>
  session?.role === 'OWNER' || session?.role === 'ADMIN'

export const canResetPasswords = (session: Session | null) =>
  session?.role === 'OWNER' || session?.role === 'ADMIN'

export const sessionFromRequest = async (request: {
  cookies: { get: (name: string) => { value: string } | undefined }
}): Promise<Session | null> =>
  decodeSessionToken(
    request.cookies.get('access_token')?.value ??
      request.cookies.get('refresh_token')?.value ??
      request.cookies.get('auth_session')?.value,
  )

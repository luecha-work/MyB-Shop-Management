export type Session = {
  userId: string
  role: 'OWNER' | 'ADMIN' | 'STAFF'
  name: string
  email: string
  branchId: string | null
  branchName: string | null
}

export const decodeSessionToken = (value: string | undefined) => {
  if (!value) return null
  try {
    return JSON.parse(value) as Session
  } catch {
    return null
  }
}

export const canManageSettings = (session: Session | null) =>
  session?.role === 'OWNER' || session?.role === 'ADMIN'

export const sessionFromRequest = (request: {
  cookies: { get: (name: string) => { value: string } | undefined }
}) =>
  decodeSessionToken(
    request.cookies.get('access_token')?.value ??
      request.cookies.get('refresh_token')?.value ??
      request.cookies.get('auth_session')?.value,
  )

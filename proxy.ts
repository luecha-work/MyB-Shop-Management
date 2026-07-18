import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeSessionToken, type Session } from '@/lib/auth/session'
import { signAccessToken } from '@/lib/auth/jwt'

const ACCESS_TOKEN_MAX_AGE = 60 * 60 // 1 hour

const isJwt = (value: string): boolean =>
  value.split('.').length === 3 && value.startsWith('eyJ')

export async function proxy(request: NextRequest) {
  const accessTokenCookie = request.cookies.get('access_token')
  const refreshTokenCookie = request.cookies.get('refresh_token')
  const legacySessionCookie = request.cookies.get('auth_session')
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const hasAuthCookie = Boolean(accessTokenCookie || refreshTokenCookie || legacySessionCookie)

  // Priority: access_token > refresh_token > auth_session (legacy)
  let session: Session | null = accessTokenCookie
    ? await decodeSessionToken(accessTokenCookie.value)
    : null

  if (!session && refreshTokenCookie) {
    session = await decodeSessionToken(refreshTokenCookie.value)
  }

  if (!session && legacySessionCookie) {
    session = await decodeSessionToken(legacySessionCookie.value)
  }

  const response = NextResponse.next()

  // Token refresh: if access_token is missing but we have a valid session from refresh_token,
  // issue a new JWT access_token
  if (session && !accessTokenCookie && refreshTokenCookie) {
    try {
      const newAccessToken = await signAccessToken(session)
      response.cookies.set('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: ACCESS_TOKEN_MAX_AGE,
        path: '/',
        sameSite: 'lax',
      })
    } catch {
      // If signing fails (e.g. missing JWT_SECRET), continue without refresh
    }
  }

  // Legacy refresh fallback: old JSON sessions still valid during migration (24h window)
  if (
    !session &&
    !accessTokenCookie &&
    refreshTokenCookie &&
    !isJwt(refreshTokenCookie.value)
  ) {
    try {
      const legacy = JSON.parse(refreshTokenCookie.value) as Record<string, unknown>
      if (legacy?.userId) {
        session = {
          userId: String(legacy.userId),
          role: (legacy.role as Session['role']) ?? 'STAFF',
          name: String(legacy.name ?? ''),
          email: String(legacy.email ?? ''),
          branchId: legacy.branchId ? String(legacy.branchId) : null,
          branchName: legacy.branchName ? String(legacy.branchName) : null,
        }
        response.cookies.set('access_token', refreshTokenCookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: ACCESS_TOKEN_MAX_AGE,
          path: '/',
          sameSite: 'lax',
        })
      }
    } catch {
      // Legacy cookie is malformed - ignore
    }
  }

  const role = session?.role ?? null

  const authenticatedHome = () => (role === 'STAFF' ? '/pos' : '/dashboard')

  if (!session && hasAuthCookie) {
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    response.cookies.delete('auth_session')
  }

  if (!session && !isAuthPage) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    if (hasAuthCookie) {
      redirectResponse.cookies.delete('access_token')
      redirectResponse.cookies.delete('refresh_token')
      redirectResponse.cookies.delete('auth_session')
    }
    return redirectResponse
  }

  const isAdminRoute =
    request.nextUrl.pathname === '/users' ||
    request.nextUrl.pathname.startsWith('/users/') ||
    request.nextUrl.pathname === '/branches' ||
    request.nextUrl.pathname.startsWith('/branches')

  if (role === 'STAFF' && isAdminRoute) {
    return NextResponse.redirect(new URL('/pos', request.url))
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL(authenticatedHome(), request.url))
  }

  if (request.nextUrl.pathname === '/' && session) {
    return NextResponse.redirect(new URL(authenticatedHome(), request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

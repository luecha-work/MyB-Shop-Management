import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ACCESS_TOKEN_MAX_AGE = 60 * 60 // 1 hour

const readSessionRole = (value: string) => {
  try {
    const session = JSON.parse(value) as { role?: string }
    return session.role
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')
  const refreshToken = request.cookies.get('refresh_token')
  const legacySession = request.cookies.get('auth_session')
  const authCookie = accessToken ?? refreshToken ?? legacySession
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const applyAccessRefresh = (response: NextResponse) => {
    if (!accessToken && refreshToken) {
      response.cookies.set('access_token', refreshToken.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: ACCESS_TOKEN_MAX_AGE,
        path: '/',
        sameSite: 'lax',
      })
    }
    return response
  }

  const authenticatedHome = () => {
    const role = authCookie ? readSessionRole(authCookie.value) : null
    return role === 'STAFF' ? '/pos' : '/dashboard'
  }

  if (!authCookie && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = authCookie ? readSessionRole(authCookie.value) : null
  const isAdminRoute =
    request.nextUrl.pathname === '/users' ||
    request.nextUrl.pathname.startsWith('/users/') ||
    request.nextUrl.pathname.startsWith('/branches')

  if (role === 'STAFF' && isAdminRoute) {
    return applyAccessRefresh(NextResponse.redirect(new URL('/pos', request.url)))
  }

  if (authCookie && isAuthPage) {
    return applyAccessRefresh(NextResponse.redirect(new URL(authenticatedHome(), request.url)))
  }

  if (request.nextUrl.pathname === '/' && authCookie) {
    return applyAccessRefresh(NextResponse.redirect(new URL(authenticatedHome(), request.url)))
  }

  return applyAccessRefresh(NextResponse.next())
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

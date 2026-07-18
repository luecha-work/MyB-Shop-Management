import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { Session } from './session'

let _secret: Uint8Array | null = null

const getSecret = (): Uint8Array => {
  if (_secret) return _secret
  const raw = process.env.JWT_SECRET
  if (!raw || raw.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters')
  }
  _secret = new TextEncoder().encode(raw)
  return _secret
}

export const signAccessToken = async (session: Session): Promise<string> =>
  new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getSecret())

export const signRefreshToken = async (session: Session): Promise<string> =>
  new SignJWT({ ...session, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret())

export const verifyToken = async <T = JWTPayload>(
  token: string,
): Promise<(T & JWTPayload) | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as T & JWTPayload
  } catch {
    return null
  }
}

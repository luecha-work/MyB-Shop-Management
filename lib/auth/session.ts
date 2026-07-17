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

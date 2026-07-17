'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Dummy login logic
  if (email === 'admin@myb.com' && password === 'admin123') {
    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_session', JSON.stringify({ role: 'ADMIN', name: 'Admin User', email }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })

    
    redirect('/dashboard')
  } else if (email === 'staff@myb.com' && password === 'staff123') {
    // Set cookie for staff
    const cookieStore = await cookies()
    cookieStore.set('auth_session', JSON.stringify({ role: 'STAFF', name: 'Staff User', email }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })
    
    redirect('/pos')
  }

  return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_session')
  redirect('/login')
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('auth_session')
  if (session) {
    return JSON.parse(session.value)
  }
  return null
}

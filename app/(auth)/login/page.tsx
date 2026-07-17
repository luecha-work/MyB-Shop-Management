'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, undefined)

  return (
    <div className="h-screen w-full flex items-center justify-center bg-surface">
      <div className="bg-white p-8 rounded-2xl shadow-premium border border-outline-variant/30 text-center max-w-md w-full mx-4">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-headline-xl mx-auto mb-6">
          M
        </div>
        <h1 className="font-headline-xl text-primary font-bold leading-none mb-2">My.B</h1>
        <p className="text-on-surface-variant font-body-md mb-8">Admin Management Login</p>

        <form action={action} className="space-y-4">
          <div className="text-left">
            <label className="block text-label-md text-on-surface-variant mb-1 font-bold">อีเมล</label>
            <input
              type="email"
              name="email"
              defaultValue="admin@myb.com"
              required
              className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md"
              placeholder="กรอกอีเมลของคุณ"
            />
          </div>
          
          <div className="text-left">
            <label className="block text-label-md text-on-surface-variant mb-1 font-bold">รหัสผ่าน</label>
            <input
              type="password"
              name="password"
              defaultValue="admin123"
              required
              className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md"
              placeholder="กรอกรหัสผ่าน"
            />
          </div>

          {state?.error && (
            <div className="text-error font-body-sm bg-error-container/30 px-3 py-2 rounded-lg text-left">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 mt-4 flex items-center justify-center gap-2 interactive-press"
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        <div className="mt-8 text-left bg-surface-container-low p-4 rounded-xl border border-surface-container-highest">
          <h3 className="font-label-md font-bold text-on-surface-variant mb-2">บัญชีทดสอบ (Demo)</h3>
          <div className="text-body-sm text-on-surface-variant space-y-1">
            <p><span className="font-bold">Admin:</span> admin@myb.com / admin123</p>
            <p><span className="font-bold">Staff:</span> staff@myb.com / staff123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

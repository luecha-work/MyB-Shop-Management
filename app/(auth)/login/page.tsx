'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'
import { Input, Button } from 'antd'
import { MailOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'

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
            <Input
              type="email"
              name="email"
              defaultValue="admin@myb.com"
              required
              prefix={<MailOutlined className="text-outline-variant mr-2" />}
              placeholder="กรอกอีเมลของคุณ"
              className="font-body-md"
            />
          </div>
          
          <div className="text-left">
            <label className="block text-label-md text-on-surface-variant mb-1 font-bold">รหัสผ่าน</label>
            <Input.Password
              name="password"
              defaultValue="admin123"
              required
              prefix={<LockOutlined className="text-outline-variant mr-2" />}
              placeholder="กรอกรหัสผ่าน"
              className="font-body-md"
            />
          </div>

          {state?.error && (
            <div className="text-error font-body-sm bg-error-container/30 px-3 py-2 rounded-lg text-left">
              {state.error}
            </div>
          )}

          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            icon={<LoginOutlined />}
            className="w-full mt-4 font-bold h-12 text-body-md"
            style={{ borderRadius: 8 }}
          >
            เข้าสู่ระบบ
          </Button>
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

'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'
import { Input, Button } from 'antd'
import { MailOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, undefined)

  return (
    <main className="min-h-screen w-full bg-surface flex items-center justify-center px-4 py-8">
      <section
        className="bg-white rounded-2xl shadow-premium border border-outline-variant/30"
        style={{ width: 'min(100%, 440px)', padding: 32 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-headline-xl mx-auto mb-6">
          M
        </div>
        <div className="text-center mb-8">
          <h3 className="font-headline-md text-headline-md text-primary font-bold leading-tight">Login to My.B Shop Management</h3>
        </div>

        <form action={action} className="space-y-4">
          <div className="text-left">
            <label className="block text-label-md text-on-surface-variant mb-1 font-bold">อีเมล</label>
            <Input
              type="email"
              name="email"
              required
              prefix={<MailOutlined className="text-outline-variant mr-2" />}
              placeholder="กรอกอีเมลของคุณ"
              className="font-body-md"
              size="large"
            />
          </div>

          <div className="text-left">
            <label className="block text-label-md text-on-surface-variant mb-1 font-bold">รหัสผ่าน</label>
            <Input.Password
              name="password"
              required
              prefix={<LockOutlined className="text-outline-variant mr-2" />}
              placeholder="กรอกรหัสผ่าน"
              className="font-body-md"
              size="large"
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
            className="w-full mt-4 font-bold text-body-md"
            size="large"
            style={{ height: 48, borderRadius: 8 }}
          >
            เข้าสู่ระบบ
          </Button>
        </form>
      </section>
    </main>
  )
}

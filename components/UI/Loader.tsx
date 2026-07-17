'use client'

import { Spin } from 'antd'

export function Loader({ text = 'กำลังโหลดข้อมูล...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 z-[9999] flex flex-col justify-center items-center gap-4">
      <Spin size="large" />
      <p className="font-body-md text-on-surface-variant">{text}</p>
    </div>
  )
}

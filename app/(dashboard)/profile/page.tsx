'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Card, Descriptions, Empty, Tag } from 'antd'
import {
  BankOutlined,
  CheckCircleOutlined,
  IdcardOutlined,
  MailOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Loader } from '@/components/UI/Loader'

type ProfileData = {
  firstName: string
  lastName: string
  email: string
  role: string
  branchName: string
  branchCode: string
  status: string
}

const roleMeta = (role: string) => {
  const normalized = role.toUpperCase()
  if (normalized === 'OWNER') return { label: 'OWNER', color: 'purple', text: 'เจ้าของระบบ' }
  if (normalized === 'ADMIN') return { label: 'ADMIN', color: 'blue', text: 'ผู้ดูแลร้าน' }
  return { label: 'STAFF', color: 'gold', text: 'พนักงานประจำร้าน' }
}

const statusTag = (status: string) => {
  if (status === 'active') {
    return (
      <Tag className="!m-0 rounded-full border-emerald-300 bg-emerald-50 !text-emerald-700 font-bold">
        <CheckCircleOutlined className="mr-1" />
        เปิดใช้งาน
      </Tag>
    )
  }

  return (
    <Tag className="!m-0 rounded-full border-slate-300 bg-slate-50 !text-slate-600 font-bold">
      <StopOutlined className="mr-1" />
      ปิดใช้งาน
    </Tag>
  )
}

const infoTileClass = 'rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 min-w-0'

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    fetch('/api/profile', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลโปรไฟล์ไม่สำเร็จ')
        return data as ProfileData
      })
      .then((data) => {
        if (active) setProfile(data)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'โหลดข้อมูลโปรไฟล์ไม่สำเร็จ')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [])

  const name = useMemo(() => `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(), [profile])
  const userInitial = name ? name.charAt(0).toUpperCase() : 'U'
  const role = roleMeta(profile?.role ?? '')
  const branchLabel = profile?.branchName || 'ไม่ได้ผูกสาขา'
  const branchCodeLabel = profile?.branchCode || '-'

  if (isLoading) return <Loader text="กำลังโหลดโปรไฟล์..." />

  return (
    <div className="h-full flex flex-col p-margin-mobile pb-24 md:p-margin-desktop md:pb-28 lg:pb-margin-desktop w-full overflow-y-auto bg-background">
      {error && (
        <div className="fixed right-4 top-[88px] z-[1200] w-[min(420px,calc(100vw-2rem))]">
          <Alert title={error} type="error" showIcon closable onClose={() => setError('')} className="rounded-xl shadow-card" />
        </div>
      )}

      <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl flex-shrink-0">
        <div className="flex items-stretch gap-4">
          <div className="w-[6px] bg-gradient-to-b from-secondary to-secondary/30 rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(118,90,36,0.2)]" />
          <div>
            <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-xs">Profile</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-0.5">ข้อมูลบัญชีและสาขาที่ผูกกับผู้ใช้งาน</p>
          </div>
        </div>
      </div>

      {!profile ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/80 p-xl">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่พบข้อมูลโปรไฟล์" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,420px)_1fr] gap-lg max-w-6xl">
          <Card className="rounded-xl shadow-card border-outline-variant/80 overflow-hidden">
            <div className="relative -m-6 mb-0 bg-primary px-6 pb-8 pt-7 text-on-primary">
              <div className="absolute right-5 top-5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
                {role.text}
              </div>
              <div className="flex items-end gap-4 pt-10">
                <div className="h-24 w-24 rounded-2xl border-4 border-white/20 bg-white text-primary shadow-premium flex items-center justify-center text-[40px] font-bold">
                  {userInitial}
                </div>
                <div className="min-w-0 pb-1">
                  <h1 className="text-title-lg md:text-headline-md font-headline-md font-bold text-on-primary break-words">{name}</h1>
                  <div className="mt-2 flex items-center gap-2 text-sm text-white/80 min-w-0">
                    <MailOutlined className="flex-shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Tag color={role.color} className="!m-0 rounded-full px-3 py-1 text-xs font-bold">
                  <SafetyCertificateOutlined className="mr-1" />
                  {role.label}
                </Tag>
                {statusTag(profile.status)}
                <Tag className="!m-0 rounded-full border-outline-variant bg-surface-container-low px-3 py-1 text-xs font-bold !text-on-surface-variant">
                  <ReadOutlined className="mr-1" />
                  ดูได้อย่างเดียว
                </Tag>
              </div>

              <div className="rounded-xl border border-outline-variant/60 bg-secondary-container/20 p-4">
                <div className="text-xs font-semibold text-on-surface-variant mb-1">ประจำร้าน / สาขา</div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-on-secondary">
                    <ShopOutlined />
                  </div>
                  <div className="min-w-0">
                    <div className="font-headline-sm text-primary break-words">{branchLabel}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">รหัสสาขา {branchCodeLabel}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              <div className={infoTileClass}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <IdcardOutlined />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-on-surface-variant">ชื่อผู้ใช้งาน</div>
                    <div className="font-semibold text-on-surface break-words">{name}</div>
                  </div>
                </div>
              </div>
              <div className={infoTileClass}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <SafetyCertificateOutlined />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-on-surface-variant">สิทธิ์การใช้งาน</div>
                    <div className="font-semibold text-on-surface">{role.label}</div>
                  </div>
                </div>
              </div>
              <div className={infoTileClass}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <BankOutlined />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-on-surface-variant">สาขาที่ดูแล</div>
                    <div className="font-semibold text-on-surface break-words">{branchLabel}</div>
                  </div>
                </div>
              </div>
            </div>

            <Card
              title={
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary-container/30 flex items-center justify-center text-secondary">
                    <UserOutlined />
                  </div>
                  <div>
                    <div className="font-headline-sm text-on-surface">รายละเอียดข้อมูลส่วนตัว</div>
                    <div className="text-xs text-on-surface-variant mt-0.5 font-normal">ข้อมูลจากบัญชีผู้ใช้ในระบบ</div>
                  </div>
                </div>
              }
              className="rounded-xl shadow-card border-outline-variant/80"
            >
              <Descriptions
                bordered
                column={{ xs: 1, sm: 1, md: 2 }}
                styles={{
                  label: { width: 160, fontWeight: 600, color: 'var(--color-on-surface-variant)' },
                  content: { color: 'var(--color-on-surface)' },
                }}
                items={[
                  { key: 'firstName', label: 'ชื่อ', children: profile.firstName },
                  { key: 'lastName', label: 'นามสกุล', children: profile.lastName },
                  { key: 'email', label: 'อีเมล', children: <span className="break-all">{profile.email}</span> },
                  { key: 'role', label: 'Role', children: <Tag color={role.color} className="!m-0 font-bold">{role.label}</Tag> },
                  { key: 'branchName', label: 'สาขา', children: branchLabel },
                  { key: 'branchCode', label: 'รหัสสาขา', children: branchCodeLabel },
                  { key: 'status', label: 'สถานะบัญชี', children: statusTag(profile.status) },
                ]}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

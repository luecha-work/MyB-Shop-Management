'use client'

import { useState } from 'react'
import { Alert, Button, Input, Select } from 'antd'
import { SaveOutlined, ShopOutlined } from '@ant-design/icons'

type BranchForm = {
  branchCode: string
  branchName: string
  address: string
  phone: string
  status: string
}

const EMPTY_FORM: BranchForm = {
  branchCode: '',
  branchName: '',
  address: '',
  phone: '',
  status: 'active',
}

export default function AddBranchPage() {
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateField = (key: keyof BranchForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const submitBranch = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'บันทึกสาขาไม่สำเร็จ')
      }

      setForm(EMPTY_FORM)
      setSuccess('เพิ่มสาขาเรียบร้อยแล้ว')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกสาขาไม่สำเร็จ')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-margin-mobile pb-24 md:p-margin-desktop md:pb-28 lg:pb-margin-desktop w-full overflow-y-auto bg-background">
      <div className="hidden md:flex items-stretch gap-4 mb-xl flex-shrink-0">
        <div className="w-[6px] bg-gradient-to-b from-secondary to-secondary/30 rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(118,90,36,0.2)]"></div>
        <div>
          <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-xs">เพิ่มสาขา</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-0.5">สร้างข้อมูลสาขาสำหรับระบบร้านค้า</p>
        </div>
      </div>

      <div className="max-w-3xl w-full bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/80 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary">
            <ShopOutlined className="text-[20px]" />
          </div>
          <div>
            <h3 className="font-headline-sm text-primary">ข้อมูลสาขา</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">กรอกข้อมูลที่จำเป็นให้ครบถ้วน</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">รหัสสาขา</label>
            <Input
              size="large"
              value={form.branchCode}
              onChange={(event) => updateField('branchCode', event.target.value)}
              placeholder="เช่น BR001"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ชื่อสาขา</label>
            <Input
              size="large"
              value={form.branchName}
              onChange={(event) => updateField('branchName', event.target.value)}
              placeholder="เช่น สาขาหลัก"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">เบอร์โทร</label>
            <Input
              size="large"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="เบอร์โทรสาขา"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">สถานะ</label>
            <Select
              size="large"
              value={form.status}
              onChange={(value) => updateField('status', value)}
              className="w-full"
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ที่อยู่</label>
            <Input.TextArea
              rows={4}
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              placeholder="ที่อยู่สาขา"
              style={{ resize: 'none' }}
            />
          </div>
        </div>

        {error && <Alert type="error" showIcon message={error} className="mt-5 rounded-xl" />}
        {success && <Alert type="success" showIcon message={success} className="mt-5 rounded-xl" />}

        <div className="flex justify-end mt-6">
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            loading={isSaving}
            onClick={submitBranch}
          >
            บันทึกสาขา
          </Button>
        </div>
      </div>
    </div>
  )
}

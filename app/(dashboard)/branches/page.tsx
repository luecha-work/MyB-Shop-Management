'use client'

import { useEffect, useState } from 'react'
import { Alert, Button, Empty, Input, Modal, Select, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { DeleteOutlined, EditOutlined, ExclamationCircleOutlined, EyeOutlined, PlusOutlined, SaveOutlined, ShopOutlined } from '@ant-design/icons'
import { Loader } from '@/components/UI/Loader'

type BranchRow = {
  id: string
  branchCode: string
  branchName: string
  address: string
  phone: string
  status: string
  users: BranchUser[]
}

type BranchUser = {
  id: string
  name: string
  email: string
  roleName: string
  status: string
}

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

const statusTag = (status: string) => {
  if (status === 'active') return <Tag className="rounded-full border-emerald-300 bg-emerald-50 !text-emerald-700 font-bold">Active</Tag>
  return <Tag className="rounded-full border-slate-300 bg-slate-50 !text-slate-600 font-bold">Inactive</Tag>
}

const roleTag = (roleName: string) => {
  const role = roleName.toUpperCase()
  if (role === 'OWNER') return <Tag className="rounded-full border-purple-300 bg-purple-50 !text-purple-700 font-bold">{role}</Tag>
  if (role === 'ADMIN') return <Tag className="rounded-full border-blue-300 bg-blue-50 !text-blue-700 font-bold">{role}</Tag>
  return <Tag className="rounded-full border-amber-300 bg-amber-50 !text-amber-700 font-bold">{role}</Tag>
}

export default function ManageBranchesPage() {
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewingBranchId, setViewingBranchId] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewBranch, setViewBranch] = useState<BranchRow | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingBranchId, setEditingBranchId] = useState('')
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Set<keyof BranchForm>>(new Set())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!error && !success) return
    const timeoutId = window.setTimeout(() => {
      setError('')
      setSuccess('')
    }, 3000)
    return () => window.clearTimeout(timeoutId)
  }, [error, success])

  const loadBranches = async () => {
    setError('')
    const response = await fetch('/api/branches', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลสาขาไม่สำเร็จ')
    setBranches(data.branches)
  }

  useEffect(() => {
    let active = true
    fetch('/api/branches', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลสาขาไม่สำเร็จ')
        return data as { branches: BranchRow[] }
      })
      .then((data) => {
        if (active) setBranches(data.branches)
      })
      .catch((err) => {
        console.error(err)
        if (active) setError(err instanceof Error ? err.message : 'โหลดข้อมูลสาขาไม่สำเร็จ')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [])

  const updateField = (key: keyof BranchForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFormErrors((current) => {
      if (!current.has(key)) return current
      const next = new Set(current)
      next.delete(key)
      return next
    })
  }

  const openAddModal = () => {
    setEditingBranchId('')
    setForm(EMPTY_FORM)
    setFormErrors(new Set())
    setError('')
    setSuccess('')
    setAddOpen(true)
  }

  const openEditModal = (branch: BranchRow) => {
    setEditingBranchId(branch.id)
    setForm({
      branchCode: branch.branchCode,
      branchName: branch.branchName,
      address: branch.address,
      phone: branch.phone,
      status: branch.status,
    })
    setFormErrors(new Set())
    setError('')
    setSuccess('')
    setEditOpen(true)
  }

  const closeFormModal = () => {
    setAddOpen(false)
    setEditOpen(false)
    setEditingBranchId('')
    setForm(EMPTY_FORM)
    setFormErrors(new Set())
  }

  const openViewModal = async (branchId: string) => {
    setViewingBranchId(branchId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/branches?id=${encodeURIComponent(branchId)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'โหลดรายละเอียดสาขาไม่สำเร็จ')
      setViewBranch(data.branch)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายละเอียดสาขาไม่สำเร็จ')
    } finally {
      setViewingBranchId('')
    }
  }

  const submitBranch = async () => {
    const required: (keyof BranchForm)[] = ['branchCode', 'branchName']
    const nextErrors = new Set<keyof BranchForm>()
    required.forEach((key) => {
      if (!String(form[key] ?? '').trim()) nextErrors.add(key)
    })

    setFormErrors(nextErrors)
    if (nextErrors.size > 0) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const isEdit = Boolean(editingBranchId)
      const response = await fetch('/api/branches', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { ...form, id: editingBranchId } : form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'บันทึกสาขาไม่สำเร็จ')

      await loadBranches()
      setForm(EMPTY_FORM)
      setFormErrors(new Set())
      setAddOpen(false)
      setEditOpen(false)
      setEditingBranchId('')
      setSuccess(isEdit ? 'แก้ไขสาขาเรียบร้อยแล้ว' : 'เพิ่มสาขาเรียบร้อยแล้ว')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'บันทึกสาขาไม่สำเร็จ'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const executeDelete = async () => {
    setIsDeleting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/branches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'ลบสาขาไม่สำเร็จ')

      await loadBranches()
      setSelected(new Set())
      setDeleteOpen(false)
      setSuccess(`ลบสาขาแล้ว ${data.deletedCount ?? 0} รายการ`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ลบสาขาไม่สำเร็จ'
      setError(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedBranches = branches.filter((branch) => selected.has(branch.id))

  const columns: TableColumnsType<BranchRow> = [
    {
      title: 'สาขา',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 280,
      render: (_, branch) => (
        <div>
          <div className="font-semibold text-primary text-body-md">{branch.branchName}</div>
          <div className="text-xs text-on-surface-variant mt-0.5">{branch.branchCode}</div>
        </div>
      ),
    },
    {
      title: 'เบอร์โทร',
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
      render: (phone: string) => phone || '-',
    },
    {
      title: 'ที่อยู่',
      dataIndex: 'address',
      key: 'address',
      width: 320,
      ellipsis: true,
      render: (address: string) => address || '-',
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status: string) => statusTag(status),
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, branch) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="text"
            icon={<EyeOutlined />}
            loading={viewingBranchId === branch.id}
            onClick={() => openViewModal(branch.id)}
            className="text-on-surface-variant hover:!text-secondary"
            title="ดูรายละเอียด"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(branch)}
            className="text-on-surface-variant hover:!text-secondary"
            title="แก้ไขสาขา"
          />
        </div>
      ),
    },
  ]

  if (isLoading) return <Loader text="โหลดข้อมูลสาขา..." />

  return (
    <>
      <div className="h-full flex flex-col p-margin-mobile pb-24 md:p-margin-desktop md:pb-28 lg:pb-margin-desktop w-full overflow-y-auto bg-background">
        <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl flex-shrink-0">
          <div className="flex items-stretch gap-4">
            <div className="w-[6px] bg-gradient-to-b from-secondary to-secondary/30 rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(118,90,36,0.2)]"></div>
            <div>
              <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-xs">จัดการสาขา</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-0.5">รายชื่อสาขาและข้อมูลติดต่อทั้งหมด</p>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className="fixed right-4 top-[88px] z-[1200] w-[min(420px,calc(100vw-2rem))]">
            {error && <Alert title={error} type="error" showIcon className="rounded-xl shadow-card" />}
            {success && <Alert title={success} type="success" showIcon className="rounded-xl shadow-card" />}
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/80 flex flex-col">
          <div className="p-4 lg:p-lg border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface/30 flex-shrink-0">
            <h3 className="font-headline-sm text-primary flex-shrink-0">รายชื่อสาขา</h3>
            <div className="flex items-center gap-2">
              <Button
                danger
                disabled={selected.size === 0}
                icon={<DeleteOutlined />}
                onClick={() => setDeleteOpen(true)}
              >
                {selected.size > 0 ? `ลบ (${selected.size})` : 'ลบ'}
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
                เพิ่มสาขา
              </Button>
            </div>
          </div>

          <Table<BranchRow>
            rowKey="id"
            columns={columns}
            dataSource={branches}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [10, 15, 20, 25, 30],
              showTotal: (total, range) => `แสดง ${range[0]}-${range[1]} จาก ${total} รายการ`,
            }}
            scroll={{ x: 1040 }}
            rowSelection={{
              selectedRowKeys: Array.from(selected),
              onChange: (keys) => setSelected(new Set(keys as string[])),
              columnWidth: 50,
            }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่พบข้อมูลสาขา" /> }}
          />
        </div>
      </div>

      <Modal
        open={addOpen || editOpen}
        onCancel={closeFormModal}
        centered
        width={640}
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary-container/30 flex items-center justify-center text-secondary">
              {editOpen ? <EditOutlined className="text-[18px]" /> : <ShopOutlined className="text-[18px]" />}
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">{editOpen ? 'แก้ไขสาขา' : 'เพิ่มสาขา'}</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">{editOpen ? form.branchName : 'กรอกข้อมูลที่จำเป็นให้ครบถ้วน'}</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={closeFormModal} className="h-11 ant-btn-cancel-soft">ยกเลิก</Button>
            <Button block icon={<SaveOutlined />} loading={isSaving} onClick={submitBranch} className="ant-btn-secondary-solid h-11">
              {editOpen ? 'บันทึกการแก้ไข' : 'บันทึกสาขา'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-1">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">รหัสสาขา</label>
            <Input
              size="large"
              status={formErrors.has('branchCode') ? 'error' : undefined}
              value={form.branchCode}
              onChange={(event) => updateField('branchCode', event.target.value)}
              placeholder="เช่น BR001"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ชื่อสาขา</label>
            <Input
              size="large"
              status={formErrors.has('branchName') ? 'error' : undefined}
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
      </Modal>

      <Modal
        open={!!viewBranch}
        onCancel={() => setViewBranch(null)}
        centered
        width={520}
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary-container/30 flex items-center justify-center text-secondary">
              <EyeOutlined className="text-[18px]" />
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">รายละเอียดสาขา</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">{viewBranch?.branchCode}</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => setViewBranch(null)} className="h-11">ปิด</Button>
          </div>
        }
      >
        {viewBranch && (
          <div className="space-y-3 py-1">
            <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
              <div className="text-xs font-semibold text-on-surface-variant mb-1">ชื่อสาขา</div>
              <div className="font-semibold text-primary text-body-lg">{viewBranch.branchName}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
                <div className="text-xs font-semibold text-on-surface-variant mb-1">รหัสสาขา</div>
                <div className="font-medium text-on-surface">{viewBranch.branchCode}</div>
              </div>
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
                <div className="text-xs font-semibold text-on-surface-variant mb-1">สถานะ</div>
                <div>{statusTag(viewBranch.status)}</div>
              </div>
            </div>
            <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
              <div className="text-xs font-semibold text-on-surface-variant mb-1">เบอร์โทร</div>
              <div className="font-medium text-on-surface">{viewBranch.phone || '-'}</div>
            </div>
            <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
              <div className="text-xs font-semibold text-on-surface-variant mb-1">ที่อยู่</div>
              <div className="font-medium text-on-surface whitespace-pre-wrap">{viewBranch.address || '-'}</div>
            </div>
            <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs font-semibold text-on-surface-variant mb-1">ผู้ใช้ในสาขานี้</div>
                  <div className="font-semibold text-primary">{viewBranch.users.length.toLocaleString('th-TH')} คน</div>
                </div>
              </div>
              {viewBranch.users.length === 0 ? (
                <div className="text-sm text-on-surface-variant">ยังไม่มี user ที่ผูกกับสาขานี้</div>
              ) : (
                <div className="space-y-2">
                  {viewBranch.users.map((user) => (
                    <div key={user.id} className="rounded-lg border border-outline-variant/40 bg-white p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-on-surface break-words">{user.name}</div>
                          <div className="text-xs text-on-surface-variant break-all mt-0.5">{user.email}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 flex-shrink-0">
                          {roleTag(user.roleName)}
                          {statusTag(user.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        centered
        width={420}
        closable={false}
        title={
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-error-container/40 flex items-center justify-center text-error flex-shrink-0">
              <ExclamationCircleOutlined className="text-[22px]" />
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">ยืนยันการลบสาขา</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">สาขาที่มีผู้ใช้หรือธุรกรรมผูกอยู่จะลบไม่ได้</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => setDeleteOpen(false)} className="h-11 ant-btn-cancel-soft">ยกเลิก</Button>
            <Button type="primary" danger block icon={<DeleteOutlined />} loading={isDeleting} onClick={executeDelete} className="h-11">
              ยืนยันการลบ
            </Button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant mb-3">
          ต้องการลบสาขา <span className="font-bold text-error">{selected.size} รายการ</span> ออกจากระบบ?
        </p>
        <ul className="space-y-2 max-h-48 overflow-y-auto bg-error-container/10 border border-error/15 rounded-xl p-3">
          {selectedBranches.map((branch) => (
            <li key={branch.id} className="text-sm text-on-surface">
              <span className="font-semibold">{branch.branchName}</span> <span className="text-on-surface-variant">({branch.branchCode})</span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}

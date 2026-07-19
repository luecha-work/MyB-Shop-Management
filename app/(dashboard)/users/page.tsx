'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Checkbox, Empty, Input, Modal, Pagination, Select, Space, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, KeyOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, UserAddOutlined } from '@ant-design/icons'
import { Loader } from '@/components/UI/Loader'

type UserRow = {
  id: string
  firstName: string
  lastName: string
  name: string
  email: string
  status: string
  roleId: string
  roleName: string
  branchId: string | null
  branchCode: string
  branchName: string
  isCurrentUser: boolean
}

type RoleOption = {
  id: string
  roleName: string
  description: string
}

type BranchOption = {
  id: string
  branchCode: string
  branchName: string
}

type UserForm = {
  firstName: string
  lastName: string
  email: string
  password: string
  roleId: string
  branchId: string
  status: string
}

const EMPTY_FORM: UserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roleId: '',
  branchId: '',
  status: 'active',
}

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 30]

type PasswordResult = {
  title: string
  email: string
  password: string
} | null

const statusTag = (status: string) => {
  if (status === 'active') return <Tag className="rounded-full border-emerald-300 bg-emerald-50 !text-emerald-700 font-bold">Active</Tag>
  return <Tag className="rounded-full border-slate-300 bg-slate-50 !text-slate-600 font-bold">Inactive</Tag>
}

const generateClientPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [canResetPasswords, setCanResetPasswords] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [resettingUserId, setResettingUserId] = useState('')
  const [resetUser, setResetUser] = useState<UserRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [passwordResult, setPasswordResult] = useState<PasswordResult>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Set<keyof UserForm>>(new Set())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    if (!error && !success) return
    const timeoutId = window.setTimeout(() => {
      setError('')
      setSuccess('')
    }, 3000)
    return () => window.clearTimeout(timeoutId)
  }, [error, success])

  const loadUsers = async () => {
    setError('')
    const response = await fetch('/api/users', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ')
    setUsers(data.users)
    setRoles(data.roles)
    setBranches(data.branches)
    setCanResetPasswords(Boolean(data.permissions?.canResetPasswords))
  }

  useEffect(() => {
    let active = true
    fetch('/api/users', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ')
        return data as { users: UserRow[]; roles: RoleOption[]; branches: BranchOption[]; permissions?: { canResetPasswords?: boolean } }
      })
      .then((data) => {
        if (!active) return
        setUsers(data.users)
        setRoles(data.roles)
        setBranches(data.branches)
        setCanResetPasswords(Boolean(data.permissions?.canResetPasswords))
      })
      .catch((err) => {
        console.error(err)
        if (active) setError(err instanceof Error ? err.message : 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [])

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === form.roleId)?.roleName ?? '',
    [roles, form.roleId],
  )
  const isStaff = selectedRole === 'staff'
  const isOwner = selectedRole === 'owner'
  const showBranchField = Boolean(selectedRole) && !isOwner
  const selectedUsers = users.filter((user) => selected.has(user.id))
  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return users.slice(startIndex, startIndex + itemsPerPage)
  }, [users, currentPage, itemsPerPage])

  const resetSelection = () => setSelected(new Set())

  const toggleSelect = (user: UserRow, checked: boolean) => {
    if (user.isCurrentUser) return
    const next = new Set(selected)
    if (checked) next.add(user.id)
    else next.delete(user.id)
    setSelected(next)
  }

  const updateField = (key: keyof UserForm, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      const nextRole = key === 'roleId' ? roles.find((role) => role.id === value)?.roleName ?? '' : selectedRole
      if (nextRole === 'owner') next.branchId = ''
      return next
    })
    setFormErrors((current) => {
      if (!current.has(key)) return current
      const next = new Set(current)
      next.delete(key)
      if (key === 'roleId') next.delete('branchId')
      return next
    })
  }

  const openAddModal = () => {
    setEditingUserId('')
    setForm({ ...EMPTY_FORM, password: generateClientPassword() })
    setFormErrors(new Set())
    setError('')
    setSuccess('')
    setAddOpen(true)
  }

  const openEditModal = (user: UserRow) => {
    setEditingUserId(user.id)
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      roleId: user.roleId,
      branchId: user.branchId ?? '',
      status: user.status,
    })
    setFormErrors(new Set())
    setError('')
    setSuccess('')
    setEditOpen(true)
  }

  const closeFormModal = () => {
    setAddOpen(false)
    setEditOpen(false)
    setEditingUserId('')
    setForm(EMPTY_FORM)
    setFormErrors(new Set())
  }

  const submitUser = async () => {
    const isEdit = Boolean(editingUserId)
    const required: (keyof UserForm)[] = isEdit
      ? ['firstName', 'lastName', 'email', 'roleId']
      : ['firstName', 'lastName', 'email', 'password', 'roleId']
    const nextErrors = new Set<keyof UserForm>()
    required.forEach((key) => {
      if (!String(form[key] ?? '').trim()) nextErrors.add(key)
    })
    if (isStaff && !form.branchId) nextErrors.add('branchId')

    setFormErrors(nextErrors)
    if (nextErrors.size > 0) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const isEdit = Boolean(editingUserId)
      const response = await fetch('/api/users', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { ...form, action: 'update-user', userId: editingUserId } : form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'บันทึกผู้ใช้ไม่สำเร็จ')

      await loadUsers()
      setForm(EMPTY_FORM)
      setFormErrors(new Set())
      setAddOpen(false)
      setEditOpen(false)
      setEditingUserId('')
      if (isEdit) {
        setSuccess('แก้ไขผู้ใช้เรียบร้อยแล้ว')
      } else {
        setPasswordResult({
          title: 'เพิ่มผู้ใช้เรียบร้อยแล้ว',
          email: form.email,
          password: data.temporaryPassword || form.password,
        })
        setSuccess('เพิ่มผู้ใช้เรียบร้อยแล้ว')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกผู้ใช้ไม่สำเร็จ')
    } finally {
      setIsSaving(false)
    }
  }

  const resetPassword = async () => {
    if (!resetUser) return

    const user = resetUser
    setResettingUserId(user.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', userId: user.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'reset password ไม่สำเร็จ')

      setPasswordResult({
        title: 'Reset password เรียบร้อยแล้ว',
        email: user.email,
        password: data.temporaryPassword,
      })
      setResetUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'reset password ไม่สำเร็จ')
    } finally {
      setResettingUserId('')
    }
  }

  const copyPassword = async () => {
    if (!passwordResult?.password) return
    try {
      await navigator.clipboard.writeText(passwordResult.password)
      setSuccess('คัดลอกรหัสผ่านแล้ว')
    } catch {
      setError('คัดลอกรหัสผ่านไม่สำเร็จ')
    }
  }

  const copyFormPassword = async () => {
    if (!form.password) return
    try {
      await navigator.clipboard.writeText(form.password)
      setSuccess('คัดลอกรหัสผ่านแล้ว')
    } catch {
      setError('คัดลอกรหัสผ่านไม่สำเร็จ')
    }
  }

  const executeDelete = async () => {
    setIsDeleting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'ลบผู้ใช้ไม่สำเร็จ')

      await loadUsers()
      resetSelection()
      setDeleteOpen(false)
      setSuccess(`ลบผู้ใช้แล้ว ${data.deletedCount ?? 0} รายการ`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบผู้ใช้ไม่สำเร็จ')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: TableColumnsType<UserRow> = [
    {
      title: 'ผู้ใช้',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (_, user) => (
        <div>
          <div className="font-semibold text-primary text-body-md">{user.name}</div>
          <div className="text-xs text-on-surface-variant mt-0.5 break-all">{user.email}</div>
        </div>
      ),
    },
    {
      title: 'บทบาท',
      dataIndex: 'roleName',
      key: 'roleName',
      width: 120,
      render: (roleName: string) => <span className="font-bold text-secondary">{roleName.toUpperCase()}</span>,
    },
    {
      title: 'สาขา',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 220,
      render: (_, user) => user.branchName ? `${user.branchName} (${user.branchCode})` : 'ทุกสาขา',
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
      width: 220,
      align: 'center',
      render: (_, user) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(user)}
            className="text-on-surface-variant hover:!text-secondary"
          >
            แก้ไข
          </Button>
          {canResetPasswords && (
            <Button
              type="text"
              icon={<ReloadOutlined />}
              loading={resettingUserId === user.id}
              onClick={() => setResetUser(user)}
              className="text-error hover:!text-error"
            >
              รีเซ็ต
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (isLoading) return <Loader text="โหลดข้อมูลผู้ใช้..." />

  const paginationConfig = {
    current: currentPage,
    pageSize: itemsPerPage,
    total: users.length,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    showTotal: (total: number, range: [number, number]) => `แสดง ${range[0]}-${range[1]} จาก ${total} รายการ`,
    onChange: (page: number, pageSize: number) => {
      setCurrentPage(pageSize !== itemsPerPage ? 1 : page)
      setItemsPerPage(pageSize)
      resetSelection()
    },
  }

  return (
    <>
      <div className="h-full flex flex-col p-margin-mobile pb-24 md:p-margin-desktop md:pb-28 lg:pb-margin-desktop w-full overflow-y-auto bg-background">
        <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl flex-shrink-0">
          <div className="flex items-stretch gap-4">
            <div className="w-[6px] bg-gradient-to-b from-secondary to-secondary/30 rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(118,90,36,0.2)]"></div>
            <div>
              <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-xs">จัดการ user</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-0.5">รายชื่อผู้ใช้ทั้งหมดและการจัดการสิทธิ์</p>
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
            <h3 className="font-headline-sm text-primary flex-shrink-0">รายชื่อผู้ใช้</h3>
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
                เพิ่มผู้ใช้
              </Button>
            </div>
          </div>

          <div className="hidden xl:block">
            <Table<UserRow>
              rowKey="id"
              columns={columns}
              dataSource={users}
              pagination={paginationConfig}
              scroll={{ x: 900 }}
              rowSelection={{
                selectedRowKeys: Array.from(selected),
                onChange: (keys) => setSelected(new Set(keys as string[])),
                columnWidth: 50,
                getCheckboxProps: (user) => ({
                  disabled: user.isCurrentUser,
                  title: user.isCurrentUser ? 'ไม่สามารถลบบัญชีของตัวเองได้' : undefined,
                }),
              }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่พบข้อมูลผู้ใช้" /> }}
            />
          </div>

          <div className="xl:hidden flex flex-col gap-sm p-sm bg-background">
            {pageItems.length === 0 ? (
              <div className="p-lg text-center text-on-surface-variant">ไม่พบข้อมูลผู้ใช้</div>
            ) : (
              pageItems.map((user) => (
                <article
                  key={user.id}
                  className={`bg-surface-container-lowest hover:border-secondary/50 rounded-xl p-md shadow-sm border border-outline-variant/80 relative flex flex-col gap-2 transition-all duration-200 ${selected.has(user.id) ? 'bg-error/[0.04]' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary break-words min-w-0">{user.name}</span>
                    <div className="flex-shrink-0">{statusTag(user.status)}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <Checkbox
                        checked={selected.has(user.id)}
                        disabled={user.isCurrentUser}
                        onChange={(event) => toggleSelect(user, event.target.checked)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-body-md font-semibold text-on-surface break-all">{user.email}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Tag className="rounded-full border-secondary/30 bg-secondary-container/30 !text-secondary font-bold">{user.roleName.toUpperCase()}</Tag>
                        <span className="text-xs text-on-surface-variant break-words">
                          {user.branchName ? `${user.branchName} (${user.branchCode})` : 'ทุกสาขา'}
                        </span>
                      </div>
                      {user.isCurrentUser && (
                        <div className="text-[11px] text-on-surface-variant mt-1">บัญชีที่กำลังใช้งานอยู่</div>
                      )}
                    </div>
                  </div>
                  <hr className="border-t border-outline-variant/10 my-1" />
                  <div className="flex justify-end items-center gap-1 pl-6">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(user)}
                      className="text-on-surface-variant hover:!text-secondary"
                    >
                      แก้ไข
                    </Button>
                    {canResetPasswords && (
                      <Button
                        type="text"
                        icon={<ReloadOutlined />}
                        loading={resettingUserId === user.id}
                        onClick={() => setResetUser(user)}
                        className="text-error hover:!text-error"
                      >
                        รีเซ็ต
                      </Button>
                    )}
                  </div>
                </article>
              ))
            )}
            <div className="flex justify-center py-3">
              <Pagination {...paginationConfig} size="small" showTotal={undefined} />
            </div>
          </div>
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
              {editOpen ? <EditOutlined className="text-[18px]" /> : <UserAddOutlined className="text-[18px]" />}
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">{editOpen ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">
                {editOpen ? form.email : 'ระบบสุ่มรหัสผ่านให้ copy ได้ทันที และจะ hash ก่อนบันทึก'}
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={closeFormModal} className="h-11 ant-btn-cancel-soft">ยกเลิก</Button>
            <Button block icon={<SaveOutlined />} loading={isSaving} onClick={submitUser} className="ant-btn-secondary-solid h-11">
              {editOpen ? 'บันทึกการแก้ไข' : 'บันทึกผู้ใช้'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-1">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ชื่อ</label>
            <Input size="large" status={formErrors.has('firstName') ? 'error' : undefined} value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">นามสกุล</label>
            <Input size="large" status={formErrors.has('lastName') ? 'error' : undefined} value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">อีเมล</label>
            <Input size="large" status={formErrors.has('email') ? 'error' : undefined} type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">บทบาท</label>
            <Select
              size="large"
              status={formErrors.has('roleId') ? 'error' : undefined}
              value={form.roleId || undefined}
              onChange={(value) => updateField('roleId', value)}
              placeholder="เลือกบทบาท"
              className="w-full"
              options={roles.map((role) => ({ label: role.roleName.toUpperCase(), value: role.id }))}
            />
          </div>
          {!editOpen && (
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">รหัสผ่าน</label>
              <Space.Compact block>
                <Input
                  size="large"
                  readOnly
                  status={formErrors.has('password') ? 'error' : undefined}
                  value={form.password}
                />
                <Button size="large" onClick={() => updateField('password', generateClientPassword())}>
                  Generate
                </Button>
                <Button size="large" icon={<CopyOutlined />} onClick={copyFormPassword}>
                  Copy
                </Button>
              </Space.Compact>
            </div>
          )}
          {showBranchField && (
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">สาขาประจำ</label>
              <Select
                size="large"
                status={formErrors.has('branchId') ? 'error' : undefined}
                value={form.branchId || undefined}
                onChange={(value) => updateField('branchId', value)}
                placeholder={isStaff ? 'เลือกสาขาสำหรับ STAFF' : 'ไม่ระบุ = ทุกสาขา'}
                allowClear
                className="w-full"
                options={branches.map((branch) => ({
                  label: `${branch.branchName} (${branch.branchCode})`,
                  value: branch.id,
                }))}
              />
            </div>
          )}
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
        </div>
      </Modal>

      <Modal
        open={!!passwordResult}
        onCancel={() => setPasswordResult(null)}
        centered
        width={460}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary">
              <KeyOutlined className="text-[20px]" />
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">{passwordResult?.title}</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">{passwordResult?.email}</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => setPasswordResult(null)} className="h-11">ปิด</Button>
            <Button block icon={<CopyOutlined />} onClick={copyPassword} className="ant-btn-secondary-solid h-11">
              Copy password
            </Button>
          </div>
        }
      >
        <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
          <div className="text-xs font-semibold text-on-surface-variant mb-2">Temporary password</div>
          <div className="font-label-md text-base text-primary break-all bg-white border border-outline-variant/50 rounded-lg p-3">
            {passwordResult?.password}
          </div>
          <p className="text-xs text-on-surface-variant mt-3">
            แสดงรหัสผ่านครั้งนี้ครั้งเดียว กรุณา copy และส่งให้ผู้ใช้ผ่านช่องทางที่ปลอดภัย
          </p>
        </div>
      </Modal>

      <Modal
        open={!!resetUser}
        onCancel={() => setResetUser(null)}
        centered
        width={420}
        closable={false}
        title={
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary flex-shrink-0">
              <ReloadOutlined className="text-[22px]" />
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">รีเซ็ตรหัสผ่าน</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">{resetUser?.email}</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => setResetUser(null)} className="h-11 ant-btn-cancel-soft">ยกเลิก</Button>
            <Button block icon={<KeyOutlined />} loading={!!resetUser && resettingUserId === resetUser.id} onClick={resetPassword} className="ant-btn-secondary-solid h-11">
              สร้างรหัสผ่านใหม่
            </Button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant">
          ระบบจะสร้างรหัสผ่านใหม่ให้ผู้ใช้นี้ และแสดงรหัสผ่านให้ copy ได้ครั้งเดียว
        </p>
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
              <div className="font-headline-sm text-on-surface">ยืนยันการลบผู้ใช้</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">ระบบจะไม่ลบบัญชีที่กำลังใช้งานอยู่</div>
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
          ต้องการลบผู้ใช้ <span className="font-bold text-error">{selected.size} รายการ</span> ออกจากระบบ?
        </p>
        <ul className="space-y-2 max-h-48 overflow-y-auto bg-error-container/10 border border-error/15 rounded-xl p-3">
          {selectedUsers.map((user) => (
            <li key={user.id} className="text-sm text-on-surface">
              <span className="font-semibold">{user.name}</span> <span className="text-on-surface-variant">({user.email})</span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}

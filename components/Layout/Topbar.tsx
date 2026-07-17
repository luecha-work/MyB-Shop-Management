'use client'

import { useEffect, useState } from 'react'
import { logout } from '@/lib/actions/auth'
import { useRouter } from 'next/navigation'
import { Button, Menu, Popover } from 'antd'
import type { MenuProps } from 'antd'
import { DownOutlined, LogoutOutlined, ShopOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons'

type BranchOption = {
  id: string
  branchName: string
}

export default function Topbar({ user }: { user: { name: string, role: string, email: string } }) {
  const router = useRouter()
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U'
  const normalizedRole = user.role.toUpperCase()
  const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'OWNER'
  const canSelectBranch = normalizedRole === 'ADMIN' || normalizedRole === 'OWNER'
  const canManageUsersAndBranches = normalizedRole === 'ADMIN' || normalizedRole === 'OWNER'
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedBranchLabel, setSelectedBranchLabel] = useState('ทุกสาขา')
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openMenuKeys, setOpenMenuKeys] = useState<string[]>([])

  const handleDesktopMenuOpenChange = (open: boolean) => {
    if (!open) setOpenMenuKeys([])
    setDesktopMenuOpen(open)
  }

  const handleMobileMenuOpenChange = (open: boolean) => {
    if (!open) setOpenMenuKeys([])
    setMobileMenuOpen(open)
  }

  const closeUserMenu = () => {
    setOpenMenuKeys([])
    setDesktopMenuOpen(false)
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    if (!canSelectBranch) return

    let active = true
    fetch('/api/branches', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลสาขาไม่สำเร็จ')
        return data as { branches: BranchOption[] }
      })
      .then((data) => {
        if (active) setBranches(data.branches)
      })
      .catch((error) => {
        console.error(error)
        if (active) setBranches([])
      })

    return () => { active = false }
  }, [canSelectBranch])

  const userMenuItems: Required<MenuProps>['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    ...(canSelectBranch
      ? ([
          { type: 'divider' as const },
          {
            key: 'branches',
            icon: <ShopOutlined />,
            label: 'เลือกดูสาขา',
            children: [
              {
                key: 'branch:all',
                label: 'ทุกสาขา',
              },
              ...branches.map((branch) => ({
                key: `branch:${branch.id}`,
                label: branch.branchName,
              })),
            ],
          },
        ] satisfies Required<MenuProps>['items'])
      : []),
    ...(canManageUsersAndBranches
      ? ([
          { type: 'divider' as const },
          {
            key: 'add-user',
            icon: <UserAddOutlined />,
            label: 'จัดการ user',
          },
          {
            key: 'add-branch',
            icon: <ShopOutlined />,
            label: 'จัดการสาขา',
          },
        ] satisfies Required<MenuProps>['items'])
      : []),
    { type: 'divider' },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: <span className="font-semibold text-error">ออกจากระบบ</span>,
    },
  ]

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      closeUserMenu()
      logout()
      return
    }
    if (key === 'profile') {
      closeUserMenu()
      return
    }
    if (key === 'add-user') {
      router.push('/users')
      closeUserMenu()
      return
    }
    if (key === 'add-branch') {
      router.push('/branches')
      closeUserMenu()
      return
    }
    if (key.startsWith('branch:')) {
      const branchId = key.replace('branch:', '')
      const branchLabel = branchId === 'all'
        ? 'ทุกสาขา'
        : branches.find((branch) => branch.id === branchId)?.branchName ?? 'ทุกสาขา'
      setSelectedBranch(branchId)
      setSelectedBranchLabel(branchLabel)
      closeUserMenu()
    }
  }

  const userMenu = (
    <div className="profile-menu-popover w-64 rounded-xl bg-surface" onMouseLeave={closeUserMenu}>
      <div className="px-3 py-2">
        <div className="text-sm font-semibold text-on-surface break-all">{user.email}</div>
        <div className="text-xs text-secondary font-bold mt-1">{user.role}</div>
      </div>
      <div className="h-px bg-outline-variant/40 my-1" />
      <Menu
        mode="inline"
        selectable
        selectedKeys={canSelectBranch ? [`branch:${selectedBranch}`] : []}
        openKeys={openMenuKeys}
        onOpenChange={(keys) => setOpenMenuKeys(keys as string[])}
        onClick={handleUserMenuClick}
        items={userMenuItems}
        triggerSubMenuAction="click"
        inlineIndent={18}
        className="!border-none"
      />
    </div>
  )

  return (
    <>
      {/* Desktop Header (ยาวตลอดจอ และโลโก้ชิดซ้าย) */}
      <header className="hidden lg:flex justify-between items-center h-[72px] px-margin-desktop w-full bg-surface border-b border-outline-variant/80 shadow-card z-30 flex-shrink-0">
        {/* Logo / Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary font-headline-md flex-shrink-0">
            M
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary leading-none">My.B</h1>
            <p className="text-[10px] text-on-surface-variant mt-0.5 leading-none">Shop Management</p>
          </div>
        </div>

        {/* Profile Menu */}
        <div className="flex items-center gap-lg">
          <Popover
            content={userMenu}
            trigger="click"
            placement="bottomRight"
            open={desktopMenuOpen}
            onOpenChange={handleDesktopMenuOpenChange}
            styles={{ content: { padding: 0, borderRadius: 12 } }}
          >
            <Button type="text" className="h-auto px-2 py-1.5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full ${isAdmin ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-fixed text-on-primary-fixed'} flex items-center justify-center font-bold`}
                >
                  {userInitial}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-body-md font-medium leading-none">{user.name}</span>
                  <span className="text-[10px] text-secondary font-bold leading-none mt-1">
                    {canSelectBranch ? `${user.role} · ${selectedBranchLabel}` : user.role}
                  </span>
                </div>
                <DownOutlined className="text-[12px] text-on-surface-variant" />
              </div>
            </Button>
          </Popover>
        </div>
      </header>

      {/* Mobile Header (แสดงเฉพาะบน Mobile) */}
      <header className="lg:hidden sticky top-0 z-40 bg-surface/90 backdrop-blur-md px-margin-mobile py-4 border-b border-outline-variant/80 flex justify-between items-center shadow-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-sm">M</div>
          <span className="font-bold text-lg text-primary tracking-tight">My.B</span>
        </div>
        <div className="flex gap-sm">
          <Popover
            content={userMenu}
            trigger="click"
            placement="bottomRight"
            open={mobileMenuOpen}
            onOpenChange={handleMobileMenuOpenChange}
            styles={{ content: { padding: 0, borderRadius: 12 } }}
          >
            <button
              type="button"
              title="เมนูผู้ใช้"
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary relative interactive-press"
            >
              <UserOutlined className="text-[20px]" />
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${isAdmin ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'} text-[9px] font-extrabold flex items-center justify-center border-2 border-white`}
              >
                {normalizedRole === 'OWNER' ? 'OWN' : isAdmin ? 'ADM' : 'STF'}
              </span>
            </button>
          </Popover>
        </div>
      </header>
    </>
  )
}

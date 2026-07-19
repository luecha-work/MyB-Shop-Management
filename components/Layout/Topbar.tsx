'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import { Avatar, Button, Menu, Popover, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { LogOut, Store, User, UserCog } from 'lucide-react'
import { useBranch } from '@/components/Providers/BranchProvider'

const userMenuTooltip = (
  <span className="text-xs font-normal">
    กดเพื่อเปิดเมนูผู้ใช้ เลือกดูสาขา จัดการข้อมูล หรือออกจากระบบ
  </span>
)

export default function Topbar({ user }: { user: { name: string, role: string, email: string } }) {
  const router = useRouter()
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U'
  const normalizedRole = user.role.toUpperCase()
  const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'OWNER'
  const canSelectBranch = normalizedRole === 'ADMIN' || normalizedRole === 'OWNER'
  const isStaff = normalizedRole === 'STAFF'
  const canManageUsersAndBranches = normalizedRole === 'ADMIN' || normalizedRole === 'OWNER'

  const {
    selectedBranchId,
    selectedBranchLabel,
    setSelectedBranch,
    branches,
  } = useBranch()

  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openMenuKeys, setOpenMenuKeys] = useState<string[]>([])
  const [menuInstanceKey, setMenuInstanceKey] = useState(0)

  const handleDesktopMenuOpenChange = (open: boolean) => {
    if (!open) {
      setOpenMenuKeys([])
      setMenuInstanceKey((current) => current + 1)
    }
    setDesktopMenuOpen(open)
  }

  const handleMobileMenuOpenChange = (open: boolean) => {
    if (!open) {
      setOpenMenuKeys([])
      setMenuInstanceKey((current) => current + 1)
    }
    setMobileMenuOpen(open)
  }

  const closeUserMenu = () => {
    setOpenMenuKeys([])
    setMenuInstanceKey((current) => current + 1)
    setDesktopMenuOpen(false)
    setMobileMenuOpen(false)
  }

  const userMenuItems: Required<MenuProps>['items'] = [
    {
      key: 'profile',
      icon: <User size={16} />,
      label: 'Profile',
    },
    ...(canSelectBranch
      ? ([
          { type: 'divider' as const },
          {
            key: 'branches',
            icon: <Store size={16} />,
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
            icon: <UserCog size={16} />,
            label: 'จัดการ user',
          },
          {
            key: 'add-branch',
            icon: <Store size={16} />,
            label: 'จัดการสาขา',
          },
        ] satisfies Required<MenuProps>['items'])
      : []),
    { type: 'divider' },
    {
      key: 'logout',
      danger: true,
      label: (
        <span className="flex w-full items-center justify-center gap-2 font-semibold text-error">
          <LogOut size={16} />
          ออกจากระบบ
        </span>
      ),
    },
  ]

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      closeUserMenu()
      logout()
      return
    }
    if (key === 'profile') {
      router.push('/profile')
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
      setSelectedBranch(branchId === 'all' ? null : branchId)
      closeUserMenu()
    }
  }

  const selectedMenuKey = canSelectBranch
    ? (selectedBranchId ? `branch:${selectedBranchId}` : 'branch:all')
    : undefined

  const userMenu = (
    <div className="profile-menu-popover w-64 rounded-xl bg-surface" onMouseLeave={closeUserMenu}>
      <div className="px-3 py-2">
        <div className="text-sm font-semibold text-on-surface break-all">{user.email}</div>
        <div className="text-xs text-secondary font-bold mt-1">{user.role}</div>
      </div>
      <div className="h-px bg-outline-variant/40 my-1" />
      <Menu
        key={menuInstanceKey}
        mode="inline"
        selectable
        selectedKeys={selectedMenuKey ? [selectedMenuKey] : []}
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
      {/* Desktop Header */}
      <header className="hidden lg:flex justify-between items-center h-[72px] px-margin-desktop w-full bg-surface border-b border-outline-variant/80 shadow-card z-30 flex-shrink-0">
        {/* Logo / Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary font-headline-md flex-shrink-0">
            M
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary leading-none">My.b Shop</h1>
            <p className="text-[10px] text-on-surface-variant mt-0.5 leading-none">Management</p>
          </div>
        </div>

        {/* Profile Menu */}
        <div className="flex items-center gap-lg">
          <Tooltip title={userMenuTooltip} color="#6b7280">
            <Popover
              content={userMenu}
              trigger="click"
              placement="bottomRight"
              open={desktopMenuOpen}
              onOpenChange={handleDesktopMenuOpenChange}
              destroyOnHidden
              styles={{ content: { padding: 0, borderRadius: 12 } }}
            >
              <Button type="text" className="h-auto px-2 py-1.5 hover:!bg-transparent active:!bg-transparent">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full ${isAdmin ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-fixed text-on-primary-fixed'} flex items-center justify-center font-bold`}
                  >
                    {userInitial}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-body-md font-medium leading-none">{user.name}</span>
                    <span className="text-[10px] text-secondary font-bold leading-none mt-1">
                      {isStaff ? user.role : `${user.role} · ${selectedBranchLabel}`}
                    </span>
                  </div>
                </div>
              </Button>
            </Popover>
          </Tooltip>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-surface/90 backdrop-blur-md px-margin-mobile py-4 border-b border-outline-variant/80 flex justify-between items-center shadow-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-sm">M</div>
          <span className="font-bold text-lg text-primary tracking-tight">My.b Shop</span>
        </div>
        <div className="flex gap-sm">
          <Tooltip title={userMenuTooltip} color="#6b7280">
            <Popover
              content={userMenu}
              trigger="click"
              placement="bottomRight"
              open={mobileMenuOpen}
              onOpenChange={handleMobileMenuOpenChange}
              destroyOnHidden
              styles={{ content: { padding: 0, borderRadius: 12 } }}
            >
              <button
                type="button"
                aria-label="เปิดเมนูผู้ใช้"
                className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center interactive-press"
              >
                <Avatar
                  size={40}
                  icon={<User size={20} />}
                  className={isAdmin ? '!bg-secondary !text-on-secondary' : '!bg-primary !text-on-primary'}
                />
              </button>
            </Popover>
          </Tooltip>
        </div>
      </header>
    </>
  )
}

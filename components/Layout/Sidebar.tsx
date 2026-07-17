'use client'

import { Menu } from 'antd'
import { usePathname, useRouter } from 'next/navigation'
import {
  DashboardOutlined,
  ShoppingOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  InboxOutlined
} from '@ant-design/icons'

export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const isStaff = userRole === 'STAFF'

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'แดชบอร์ด', adminOnly: true },
    { key: '/pos', icon: <ShoppingOutlined />, label: 'ขาย (POS)', adminOnly: false },
    { key: '/history', icon: <HistoryOutlined />, label: 'ประวัติการขาย', adminOnly: false },
    { key: '/inventory', icon: <AppstoreOutlined />, label: 'คลังสินค้า', adminOnly: false },
    { key: '/stockin', icon: <InboxOutlined />, label: 'บันทึกรับเข้าคลัง', adminOnly: false },
  ]

  const items = menuItems
    .filter(item => !(item.adminOnly && isStaff))
    .map(item => ({
      key: item.key,
      icon: <span className="text-[20px]">{item.icon}</span>,
      label: <span className="font-body-md font-bold">{item.label}</span>,
    }))

  const activeKey = items.find(item => pathname.startsWith(item.key))?.key || '/dashboard'

  return (
    <div className="hidden lg:flex flex-col bg-surface h-full w-[72px] xl:w-[280px] border-r border-surface-container py-md z-20 shadow-sm transition-all duration-300 flex-shrink-0">
      <Menu
        mode="inline"
        selectedKeys={[activeKey]}
        onClick={({ key }) => router.push(key)}
        items={items}
        style={{ borderRight: 0, backgroundColor: 'transparent' }}
        className="mt-2 px-2"
      />
    </div>
  )
}

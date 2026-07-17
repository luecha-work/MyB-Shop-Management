'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const isStaff = userRole === 'STAFF'

  const menuItems = [
    { id: 'dashboard', href: '/dashboard', icon: 'dashboard', label: 'แดชบอร์ด', adminOnly: true },
    { id: 'pos', href: '/pos', icon: 'point_of_sale', label: 'ขาย (POS)', adminOnly: false },
    { id: 'history', href: '/history', icon: 'history', label: 'ประวัติการขาย', adminOnly: false },
    { id: 'inventory', href: '/inventory', icon: 'inventory_2', label: 'คลังสินค้า', adminOnly: false },
    { id: 'stockin', href: '/stockin', icon: 'inventory', label: 'บันทึกรับเข้าคลัง', adminOnly: false },
  ]

  return (
    <nav className="hidden lg:flex flex-col bg-surface h-full w-[72px] xl:w-[280px] border-r border-surface-container py-md z-20 shadow-sm transition-all duration-300 flex-shrink-0">
      <ul className="flex flex-col gap-sm px-2 xl:px-md flex-1">
        {menuItems.map((item) => {
          if (item.adminOnly && isStaff) return null
          
          const isActive = pathname.startsWith(item.href)
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={
                  isActive
                    ? 'flex items-center justify-center xl:justify-start gap-md px-3 xl:px-md py-sm rounded-lg text-secondary font-bold border-r-4 border-secondary bg-secondary-container/30 transition-all duration-200'
                    : 'flex items-center justify-center xl:justify-start gap-md px-3 xl:px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors'
                }
              >
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span className="font-body-md hidden xl:block">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

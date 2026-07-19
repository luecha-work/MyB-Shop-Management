'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartNoAxesCombined,
  ClipboardList,
  History,
  Package,
  Store,
} from 'lucide-react'

export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const isStaff = userRole === 'STAFF'

  const menuItems = [
    { href: '/dashboard', icon: <ChartNoAxesCombined size={22} />, label: 'แดชบอร์ด', adminOnly: true },
    { href: '/pos', icon: <Store size={22} />, label: 'ขาย (POS)', adminOnly: false },
    { href: '/history', icon: <History size={22} />, label: 'ประวัติการขาย', adminOnly: false },
    { href: '/inventory', icon: <Package size={22} />, label: 'คลังสินค้า', adminOnly: false },
    { href: '/stockin', icon: <ClipboardList size={22} />, label: 'บันทึกรับเข้าคลัง', adminOnly: false },
  ]

  return (
    <nav className="hidden lg:flex flex-col bg-surface h-full w-[72px] xl:w-[280px] border-r border-outline-variant/80 py-md z-20 shadow-card transition-all duration-300 flex-shrink-0">
      <ul className="flex flex-col gap-sm px-2 xl:px-md flex-1">
        {menuItems.map((item) => {
          if (item.adminOnly && isStaff) return null

          const isActive = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  isActive
                    ? 'flex items-center justify-center xl:justify-start gap-md px-3 xl:px-md py-sm rounded-lg text-secondary font-bold border-r-4 border-secondary bg-secondary-container/30 transition-all duration-200'
                    : 'flex items-center justify-center xl:justify-start gap-md px-3 xl:px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors'
                }
              >
                {item.icon}
                <span className="font-body-md hidden xl:block">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

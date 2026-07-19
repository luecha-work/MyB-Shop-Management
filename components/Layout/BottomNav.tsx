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

export default function BottomNav({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const isOwner = userRole === 'OWNER'

  const navItems = [
    { id: 'dashboard', href: '/dashboard', icon: <ChartNoAxesCombined size={22} />, label: 'แดชบอร์ด', ownerOnly: true },
    { id: 'pos', href: '/pos', icon: <Store size={22} />, label: 'ขาย', adminOnly: false },
    { id: 'history', href: '/history', icon: <History size={22} />, label: 'ประวัติ', adminOnly: false },
    { id: 'inventory', href: '/inventory', icon: <Package size={22} />, label: 'คลัง', adminOnly: false },
    { id: 'stockin', href: '/stockin', icon: <ClipboardList size={22} />, label: 'รับเข้า', adminOnly: false },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 py-3 bg-surface/90 backdrop-blur-xl rounded-t-xl border-t border-outline-variant/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {navItems.map((item) => {
        if (item.ownerOnly && !isOwner) return null

        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.id}
            href={item.href}
            className={
              isActive
                ? 'flex flex-col items-center justify-center bg-secondary-container text-secondary rounded-xl px-3 py-1.5 transition-all duration-150'
                : 'flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-xl p-2 transition-colors'
            }
          >
            {item.icon}
            <span className={`font-label-sm mt-0.5 ${isActive ? 'font-bold' : ''}`}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

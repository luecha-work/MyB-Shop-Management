'use client'

import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'

export default function Topbar({ user }: { user: { name: string, role: string, email: string } }) {
  const pathname = usePathname()
  
  const titles: Record<string, string> = {
    '/dashboard': 'แดชบอร์ด',
    '/pos': 'ขายสินค้า (POS)',
    '/history': 'ประวัติการขาย',
    '/inventory': 'คลังสินค้า',
    '/stockin': 'รับเข้าคลัง',
  }
  
  // Find title matching the start of the path
  const currentTitle = Object.keys(titles).find(k => pathname.startsWith(k)) 
    ? titles[Object.keys(titles).find(k => pathname.startsWith(k)) as string] 
    : 'My.B'

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U'
  const isAdmin = user.role === 'ADMIN'

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden lg:flex justify-between items-center h-[72px] px-margin-desktop w-full bg-surface border-b border-surface-container shadow-sm z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary font-headline-md flex-shrink-0">
            M
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary leading-none">My.B</h1>
            <p className="text-[10px] text-on-surface-variant mt-0.5 leading-none">Admin Management</p>
          </div>
        </div>

        <div className="flex items-center gap-lg">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${isAdmin ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-fixed text-on-primary-fixed'} flex items-center justify-center font-bold`}>
              {userInitial}
            </div>
            <div className="flex flex-col">
              <span className="font-body-md font-medium leading-none">{user.name}</span>
              <span className="text-[10px] text-secondary font-bold leading-none mt-1">{user.role}</span>
            </div>
            <button onClick={() => logout()} className="ml-4 text-on-surface-variant hover:text-error transition-colors">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-surface/90 backdrop-blur-md px-margin-mobile py-4 border-b border-outline-variant/30 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-sm">M</div>
          <span className="font-bold text-lg text-primary tracking-tight hidden sm:block">My.B</span>
          <span className="font-bold text-lg text-on-surface tracking-tight">{currentTitle}</span>
        </div>
        <div className="flex gap-sm items-center">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary relative group">
            <span className="material-symbols-outlined">account_circle</span>
            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${isAdmin ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'} text-[9px] font-extrabold flex items-center justify-center border-2 border-white`}>
              {isAdmin ? 'ADM' : 'STF'}
            </span>
          </div>
          <button onClick={() => logout()} className="text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>
    </>
  )
}

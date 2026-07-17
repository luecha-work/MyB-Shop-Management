'use client'

import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import { Button, Avatar } from 'antd'
import { LogoutOutlined, UserOutlined } from '@ant-design/icons'

export default function Topbar({ user }: { user: { name: string, role: string, email: string } }) {
  const pathname = usePathname()
  
  const titles: Record<string, string> = {
    '/dashboard': 'แดชบอร์ด',
    '/pos': 'ขายสินค้า (POS)',
    '/history': 'ประวัติการขาย',
    '/inventory': 'คลังสินค้า',
    '/stockin': 'รับเข้าคลัง',
  }
  
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
          <Avatar shape="square" size={40} className="bg-primary text-on-primary font-headline-md font-bold">M</Avatar>
          <div>
            <h1 className="font-headline-md font-bold text-primary leading-none m-0">My.B</h1>
            <p className="text-[10px] text-on-surface-variant mt-1 leading-none m-0">Admin Management</p>
          </div>
        </div>

        <div className="flex items-center gap-lg">
          <div className="flex items-center gap-3">
            <Avatar 
              size={32} 
              className={isAdmin ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-fixed text-on-primary-fixed'}
            >
              {userInitial}
            </Avatar>
            <div className="flex flex-col">
              <span className="font-body-md font-medium leading-none">{user.name}</span>
              <span className="text-[10px] text-secondary font-bold leading-none mt-1">{user.role}</span>
            </div>
            <Button 
              type="text" 
              danger 
              icon={<LogoutOutlined />} 
              onClick={() => logout()} 
              className="ml-2 font-bold"
            >
              ออก
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-surface/90 backdrop-blur-md px-margin-mobile py-4 border-b border-outline-variant/30 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Avatar shape="square" size={32} className="bg-primary text-on-primary font-bold">M</Avatar>
          <span className="font-bold text-lg text-primary tracking-tight hidden sm:block">My.B</span>
          <span className="font-bold text-lg text-on-surface tracking-tight">{currentTitle}</span>
        </div>
        <div className="flex gap-sm items-center">
          <div className="relative">
            <Avatar size={40} icon={<UserOutlined />} className="bg-surface-container text-primary" />
            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${isAdmin ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'} text-[9px] font-extrabold flex items-center justify-center border-2 border-white`}>
              {isAdmin ? 'ADM' : 'STF'}
            </span>
          </div>
          <Button type="text" danger icon={<LogoutOutlined className="text-[20px]" />} onClick={() => logout()} />
        </div>
      </header>
    </>
  )
}

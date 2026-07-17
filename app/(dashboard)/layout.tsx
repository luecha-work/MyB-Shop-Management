import { getSession } from '@/lib/actions/auth'
import Sidebar from '@/components/Layout/Sidebar'
import Topbar from '@/components/Layout/Topbar'
import BottomNav from '@/components/Layout/BottomNav'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <>
      {/* Desktop Header (ยาวตลอดจอ) + Mobile Header */}
      <Topbar user={session} />

      {/* Main Layout Container (ต่ำกว่า Header) — คลาส role-staff ใช้ซ่อน .role-admin-only ทั้งแอป */}
      <div
        className={`flex-1 flex flex-row min-h-0 w-full h-full overflow-hidden relative ${session.role === 'STAFF' ? 'role-staff' : ''}`}
      >
        <Sidebar userRole={session.role} />

        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
          <main className="flex-1 flex flex-col overflow-hidden bg-background">
            {children}
          </main>
        </div>
      </div>

      <BottomNav userRole={session.role} />
    </>
  )
}

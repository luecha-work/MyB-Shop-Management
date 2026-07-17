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
    <div className="flex-1 flex flex-row min-h-0 w-full h-full overflow-hidden relative">
      <Sidebar userRole={session.role} />

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        <Topbar user={session} />
        
        <main className="flex-1 flex flex-col overflow-hidden bg-background relative z-10">
          {children}
        </main>
      </div>

      <BottomNav userRole={session.role} />
    </div>
  )
}

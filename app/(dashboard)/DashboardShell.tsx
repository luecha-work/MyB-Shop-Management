'use client'

import Sidebar from '@/components/Layout/Sidebar'
import Topbar from '@/components/Layout/Topbar'
import BottomNav from '@/components/Layout/BottomNav'
import { BranchProvider } from '@/components/Providers/BranchProvider'

type Session = {
  userId: string
  role: string
  name: string
  email: string
  branchId: string | null
  branchName: string | null
}

export default function DashboardShell({
  session,
  children,
}: {
  session: Session
  children: React.ReactNode
}) {
  return (
    <BranchProvider
      userRole={session.role}
      userBranchId={session.branchId}
      userBranchName={session.branchName}
    >
      <Topbar user={session} />

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
    </BranchProvider>
  )
}

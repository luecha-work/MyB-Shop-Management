import { getSession } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'
import DashboardShell from './DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <DashboardShell session={session}>{children}</DashboardShell>
}

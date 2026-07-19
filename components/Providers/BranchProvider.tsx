'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'

export type BranchOption = {
  id: string
  branchName: string
}

type BranchContextType = {
  /** Current selected branch ID — null means "all branches" */
  selectedBranchId: string | null
  /** Human-readable label for the current selection (derived) */
  selectedBranchLabel: string
  /** Change the selected branch. No-op for STAFF. Pass null for "all branches". */
  setSelectedBranch: (branchId: string | null) => void
  /** All active branches loaded from /api/branches?options=1 */
  branches: BranchOption[]
  /** Reload the branch list (e.g. after creating a new branch) */
  refreshBranches: () => Promise<void>
  /** Whether the branch list is currently loading */
  isBranchLoading: boolean
}

const BranchContext = createContext<BranchContextType>({
  selectedBranchId: null,
  selectedBranchLabel: 'ทุกสาขา',
  setSelectedBranch: () => {},
  branches: [],
  refreshBranches: async () => {},
  isBranchLoading: false,
})

/**
 * Hook to read/write the current branch selection.
 * Must be used inside a <BranchProvider> (wrapped in dashboard layout).
 */
export function useBranch() {
  return useContext(BranchContext)
}

export function BranchProvider({
  children,
  userRole,
  userBranchId,
  userBranchName,
}: {
  children: ReactNode
  userRole: string
  userBranchId: string | null
  userBranchName: string | null
}) {
  const normalizedRole = userRole.toUpperCase()
  const isLocked = normalizedRole === 'STAFF'
  const canSelect = normalizedRole === 'ADMIN' || normalizedRole === 'OWNER'

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    isLocked ? userBranchId : null,
  )
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [isBranchLoading, setIsBranchLoading] = useState(false)

  const refreshBranches = useCallback(async () => {
    setIsBranchLoading(true)
    try {
      const res = await fetch('/api/branches?options=1', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setBranches(data.branches ?? [])
    } catch {
      // ignore — keep stale list
    } finally {
      setIsBranchLoading(false)
    }
  }, [])

  // Load branch list on mount for OWNER/ADMIN (runs once per canSelect change)
  useEffect(() => {
    if (!canSelect) return
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for async fetch
    setIsBranchLoading(true)
    fetch('/api/branches?options=1', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return { branches: [] as BranchOption[] }
        return res.json() as Promise<{ branches: BranchOption[] }>
      })
      .then((data) => {
        if (active) setBranches(data.branches)
      })
      .catch(() => {
        if (active) setBranches([])
      })
      .finally(() => {
        if (active) setIsBranchLoading(false)
      })
    return () => { active = false }
  }, [canSelect])

  // Derived label — no extra state or effect needed
  const selectedBranchLabel = useMemo(() => {
    if (isLocked) return userBranchName ?? 'สาขาของฉัน'
    if (!selectedBranchId) return 'ทุกสาขา'
    const branch = branches.find((b) => b.id === selectedBranchId)
    return branch?.branchName ?? 'ทุกสาขา'
  }, [isLocked, userBranchName, selectedBranchId, branches])

  const setSelectedBranch = useCallback(
    (branchId: string | null) => {
      if (isLocked) return // STAFF cannot change
      setSelectedBranchId(branchId)
    },
    [isLocked],
  )

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        selectedBranchLabel,
        setSelectedBranch,
        branches,
        refreshBranches,
        isBranchLoading,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

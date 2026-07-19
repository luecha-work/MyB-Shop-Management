'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, DatePicker, Empty, Input, Modal, Pagination, Table, Checkbox, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import {
  BadgeDollarSign,
  Bike,
  ChartBar,
  CircleAlert,
  CircleDollarSign,
  CircleX,
  FileText,
  Filter,
  ReceiptText,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { thbFormat, currentMonthRange } from '@/lib/format'
import { GP_RATE_PERCENT } from '@/lib/constants'
import { Loader } from '@/components/UI/Loader'
import { useBranch } from '@/components/Providers/BranchProvider'

// ==========================================
// Types
// 1 แถว = สินค้า 1 รายการในออเดอร์
// ==========================================
type HistoryRow = {
  id?: string
  orderId: string
  date: string
  channel: string
  note: string
  productName: string
  qty: number
  totalSales: number
  netProfit: number
  gpRate: number
  gpAmount: number
  netRevenue: number
  unitPrice: number
  unitCost: number
  totalCost: number
  branchId: string
  branchName: string
  branchCode: string
}

type OrderGroup = {
  orderId: string
  date: string
  channel: string
  note: string
  branchName: string
  branchCode: string
  items: { productName: string; qty: number; totalSales: number; netProfit: number }[]
  totalSales: number
  netProfit: number
}

// ฟอร์แมตวันที่ให้อ่านง่าย เช่น "10:15 | 2 ก.ค." (logic เดิมจาก updateHistoryUI)
function formatOrderDate(date: string, withYear = false) {
  try {
    const d = new Date(date)
    if (!isNaN(d.getTime())) {
      return (
        d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) +
        ' | ' +
        d.toLocaleDateString('th-TH', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' })
      )
    }
    return date
  } catch {
    return date
  }
}

// ตรวจสอบไอคอนและสีของแต่ละช่องทางขาย พร้อมแสดงอัตรา GP
function ChannelBadge({ channel }: { channel: string }) {
  const gpPercent = GP_RATE_PERCENT[channel]
  if (channel === 'Grab') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <Bike size={14} /> Grab
        {gpPercent && <span className="text-[10px] opacity-70 ml-0.5">GP {gpPercent}</span>}
      </span>
    )
  }
  if (channel === 'LINE MAN') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-500/10 text-teal-600 border border-teal-500/20">
        <ShoppingBag size={14} /> LINE MAN
        {gpPercent && <span className="text-[10px] opacity-70 ml-0.5">GP {gpPercent}</span>}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-500/10 text-slate-700 border border-slate-500/20">
      <CircleDollarSign size={14} /> หน้าร้าน
    </span>
  )
}

// Badge อัตรากำไร — เขียว ≥15% / เหลือง ≥5% / แดงต่ำกว่านั้น
function MarginBadge({ totalSales, netProfit, size = 'md' }: { totalSales: number; netProfit: number; size?: 'md' | 'sm' }) {
  const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0
  let colorClass: string
  let icon: React.ReactNode
  if (margin >= 15) { colorClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'; icon = <TrendingUp size={14} /> }
  else if (margin >= 5) { colorClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20'; icon = <ChartBar size={14} /> }
  else { colorClass = 'bg-rose-500/10 text-rose-600 border-rose-500/20'; icon = <TrendingDown size={14} /> }

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
        <span className="text-[11px] flex items-center">{icon}</span>{margin.toFixed(1)}%
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      <span className="text-[13px] flex items-center">{icon}</span>{margin.toFixed(1)}%
    </span>
  )
}

// การ์ดสรุปสถิติด้านบน (ADMIN เท่านั้น)
function StatCard({ icon, iconBg, iconColor, label, value }: { icon: React.ReactNode; iconBg: string; iconColor: string; label: string; value: string }) {
  return (
    <div className="bg-white p-4 lg:p-5 rounded-xl shadow-card border border-outline-variant/80 flex flex-col justify-between min-h-[140px] lg:min-h-0">
      <div className="flex justify-between items-center mb-4 lg:mb-6">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-[20px] lg:text-[24px]" style={{ backgroundColor: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
      <div>
        <span className="font-body-sm lg:font-body-md text-on-surface-variant font-medium block mb-1">{label}</span>
        <span className="text-lg xl:text-[28px] xl:leading-[36px] text-primary font-bold block truncate">{value}</span>
      </div>
    </div>
  )
}

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 30]

export default function HistoryPage() {
  const monthRange = useMemo(() => currentMonthRange(), [])
  const [isLoading, setIsLoading] = useState(true)
  const [allData, setAllData] = useState<HistoryRow[]>([])
  const { selectedBranchId, selectedBranchLabel } = useBranch()
  const [loadError, setLoadError] = useState('')
  const [filterText, setFilterText] = useState('')
  const [startDate, setStartDate] = useState(monthRange.start)
  const [endDate, setEndDate] = useState(monthRange.end)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set()) // เก็บ orderId
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; orderIds: string[] }>({ open: false, orderIds: [] })
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('')

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    if (!selectedBranchId) return
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    params.set('branchId', selectedBranchId)
    params.set('_', String(Date.now()))

    const res = await fetch(`/api/sales-history?${params.toString()}`, { cache: 'no-store', signal })
    if (!res.ok) throw new Error('Failed to load sales history')
    const data = await res.json() as { rows: HistoryRow[] }

    setLoadError('')
    setAllData(data.rows)
  }, [startDate, endDate, selectedBranchId])

  const resetSelection = useCallback(() => setSelected(new Set()), [])

  useEffect(() => {
    if (!selectedBranchId) return
    const controller = new AbortController()
    Promise.resolve()
      .then(() => loadHistory(controller.signal))
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error(error)
        setLoadError('โหลดข้อมูลประวัติการขายจากฐานข้อมูลไม่สำเร็จ')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [loadHistory, selectedBranchId])

  useEffect(() => {
    // Clear stale branch-specific UI state as soon as the Topbar branch changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional branch context reset
    resetSelection()
    setDetailOrderId(null)
    setDeleteConfirm({ open: false, orderIds: [] })
    setDeleteErrorMsg('')
    setCurrentPage(1)
  }, [selectedBranchId, resetSelection])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        loadHistory().catch((error) => {
          console.error(error)
          setLoadError('โหลดข้อมูลประวัติการขายจากฐานข้อมูลไม่สำเร็จ')
        })
      }
    }

    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [loadHistory])
  // 1. Group by orderId ก่อน (logic เดิมจาก renderHistoryTable)
  const grouped = useMemo(() => {
    const groups: Record<string, OrderGroup> = {}
    const list: OrderGroup[] = []
    allData.forEach((row) => {
      const id = row.orderId
      if (!groups[id]) {
        groups[id] = {
          orderId: id,
          date: row.date,
          channel: row.channel,
          note: row.note,
          branchName: row.branchName,
          branchCode: row.branchCode,
          items: [],
          totalSales: 0,
          netProfit: 0,
        }
        list.push(groups[id])
      }
      groups[id].items.push({ productName: row.productName, qty: Number(row.qty) || 0, totalSales: Number(row.totalSales) || 0, netProfit: Number(row.netProfit) || 0 })
      groups[id].totalSales += Number(row.totalSales) || 0
      groups[id].netProfit += Number(row.netProfit) || 0
    })
    return list
  }, [allData])

  // 2. กรองตามรหัสออเดอร์ หรือชื่อสินค้า หรือช่วงเวลา (date range)
  const filtered = useMemo(() => {
    const query = filterText.toLowerCase().trim()
    const sDate = startDate ? new Date(startDate) : null
    if (sDate) sDate.setHours(0, 0, 0, 0)
    const eDate = endDate ? new Date(endDate) : null
    if (eDate) eDate.setHours(23, 59, 59, 999)

    return grouped.filter((g) => {
      let matchText = true
      if (query) {
        matchText =
          (g.orderId != null && String(g.orderId).toLowerCase().includes(query)) ||
          g.items.some((item) => item.productName != null && String(item.productName).toLowerCase().includes(query))
      }
      let matchDate = true
      if (sDate || eDate) {
        const rowDate = new Date(g.date)
        if (sDate && rowDate < sDate) matchDate = false
        if (eDate && rowDate > eDate) matchDate = false
      }
      return matchText && matchDate
    })
  }, [grouped, filterText, startDate, endDate])

  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filtered.slice(startIndex, startIndex + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  // คำนวณการ์ดสรุปสถิติด้านบนตามช่วงเวลาที่ฟิลเตอร์ (จากข้อมูลดิบทุกแถว ไม่ใช่เฉพาะหน้าปัจจุบัน)
  const stats = useMemo(() => {
    const sDate = startDate ? new Date(startDate) : null
    if (sDate) sDate.setHours(0, 0, 0, 0)
    const eDate = endDate ? new Date(endDate) : null
    if (eDate) eDate.setHours(23, 59, 59, 999)

    const all = allData.filter((r) => {
      if (sDate || eDate) {
        const rowDate = new Date(r.date)
        if (sDate && rowDate < sDate) return false
        if (eDate && rowDate > eDate) return false
      }
      return true
    })

    let totalSales = 0
    let totalProfit = 0
    const uniqueOrderIds = new Set<string>()
    all.forEach((r) => {
      totalSales += Number(r.totalSales) || 0
      totalProfit += Number(r.netProfit) || 0
      if (r.orderId) uniqueOrderIds.add(r.orderId)
    })
    const uniqueOrdersCount = uniqueOrderIds.size
    return {
      totalSales,
      totalProfit,
      ordersCount: uniqueOrdersCount,
      avgSales: uniqueOrdersCount > 0 ? totalSales / uniqueOrdersCount : 0,
    }
  }, [allData, startDate, endDate])

  const applyFilter = (fn: () => void) => {
    fn()
    setCurrentPage(1)
    resetSelection()
  }

  const toggleSelect = (orderId: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(orderId)
    else next.delete(orderId)
    setSelected(next)
  }

  const confirmDeleteSelected = () => {
    if (selected.size === 0) return
    setDeleteErrorMsg('')
    setDeleteConfirm({ open: true, orderIds: Array.from(selected) })
  }

  // ยกเลิกออเดอร์เดี่ยวจาก Detail Modal
  const confirmCancelCurrentOrder = () => {
    if (!detailOrderId) return
    setDetailOrderId(null)
    setDeleteErrorMsg('')
    setDeleteConfirm({ open: true, orderIds: [detailOrderId] })
  }

  const executeDelete = async () => {
    if (deleteConfirm.orderIds.length === 0) return
    if (!selectedBranchId) {
      setDeleteErrorMsg('กรุณาเลือกสาขาก่อนลบประวัติการขาย')
      return
    }

    setIsDeleting(true)
    setDeleteErrorMsg('')

    try {
      const response = await fetch('/api/sales-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: deleteConfirm.orderIds, branchId: selectedBranchId }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'ลบประวัติการขายไม่สำเร็จ')

      await loadHistory()
      resetSelection()
      setDeleteConfirm({ open: false, orderIds: [] })
    } catch (error) {
      setDeleteErrorMsg(error instanceof Error ? error.message : 'ลบประวัติการขายไม่สำเร็จ')
    } finally {
      setIsDeleting(false)
    }
  }

  // ข้อมูลใน Detail Modal
  const detailItems = useMemo(
    () => (detailOrderId ? allData.filter((h) => String(h.orderId) === String(detailOrderId)) : []),
    [allData, detailOrderId],
  )
  const detailFirst = detailItems[0]
  const detailSubtotal = detailItems.reduce((s, i) => s + (Number(i.totalSales) || 0), 0)
  const detailNetProfit = detailItems.reduce((s, i) => s + (Number(i.netProfit) || 0), 0)
  // Use DB-stored values — sum across all line items in the order
  const detailGpAmount = detailItems.reduce((s, i) => s + (Number(i.gpAmount) || 0), 0)
  const detailNetRevenue = detailItems.reduce((s, i) => s + (Number(i.netRevenue) || 0), 0)
  // GP rate from the first line item (same channel = same rate per order)
  const detailGpRate = Number(detailFirst?.gpRate) || 0

  // รายการที่จะลบ (แสดงใน Delete Confirm Modal)
  const deleteDisplayList = deleteConfirm.orderIds.map((orderId) => ({
    orderId,
    desc: allData.filter((h) => String(h.orderId) === String(orderId)).map((m) => m.productName).join(', '),
  }))

  const deleteBtnActive = selected.size > 0

  // แสดง loading ระหว่างรอโหลดข้อมูล
  if (isLoading) return <Loader text="โหลดข้อมูลประวัติการขาย..." />

  const paginationConfig = {
    current: currentPage,
    pageSize: itemsPerPage,
    total: filtered.length,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    showTotal: (total: number, range: [number, number]) => `แสดง ${range[0]}-${range[1]} จาก ${total} รายการ`,
    onChange: (page: number, pageSize: number) => {
      setCurrentPage(pageSize !== itemsPerPage ? 1 : page)
      setItemsPerPage(pageSize)
      resetSelection()
    },
  }

  // ตาราง Desktop (antd Table)
  const columns: TableColumnsType<OrderGroup> = [
    {
      title: 'รหัสรายการ / วัน-เวลา',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 220,
      render: (val: string, record) => (
        <div>
          <div className="font-semibold text-primary text-body-md">{val}</div>
          <div className="text-xs text-on-surface-variant mt-0.5">{formatOrderDate(record.date)}</div>
        </div>
      ),
    },
    {
      title: 'รายการสินค้า',
      key: 'items',
      width: 430,
      render: (_, record) =>
        record.items.length === 0 ? '-' : (
          <span className="font-semibold text-on-surface text-body-md">
            {record.items[0].productName} <span className="text-xs font-medium text-on-surface-variant/80 ml-1">x{record.items[0].qty}</span>
            {record.items.length > 1 && (
              <span className="text-xs font-semibold text-secondary ml-1.5">(และอีก {record.items.length - 1} รายการ)</span>
            )}
          </span>
        ),
    },
    {
      title: 'ช่องทางการขาย',
      dataIndex: 'channel',
      key: 'channel',
      width: 150,
      render: (val: string) => <ChannelBadge channel={val} />,
    },
    {
      title: 'ยอดขายสุทธิ',
      dataIndex: 'totalSales',
      key: 'totalSales',
      width: 130,
      align: 'right',
      render: (val: number) => <span className="font-bold text-body-md text-secondary">{thbFormat(val)}</span>,
    },
    {
      title: 'อัตรากำไร',
      key: 'margin',
      width: 120,
      align: 'center',
      render: (_, record) => <MarginBadge totalSales={record.totalSales} netProfit={record.netProfit} />,
    },
    {
      title: 'หมายเหตุ',
      dataIndex: 'note',
      key: 'note',
      width: 130,
      ellipsis: true,
      render: (val: string) => <span className="text-on-surface-variant" title={val || ''}>{val || '-'}</span>,
    },
  ]

  return (
    <>
      <div className="h-full flex flex-col p-margin-mobile pb-24 md:p-margin-desktop md:pb-28 lg:pb-margin-desktop w-full overflow-y-auto bg-background">
        {loadError && <div className="mb-md rounded-xl border border-error/20 bg-error-container/20 p-3 text-sm font-medium text-error">{loadError}</div>}

        {/* Page Header */}
        <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl flex-shrink-0">
          <div className="flex items-stretch gap-4">
            <div className="w-[6px] bg-gradient-to-b from-secondary to-secondary/30 rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(118,90,36,0.2)]"></div>
            <div>
              <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-xs">ประวัติการขาย</h2>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-0.5">ภาพรวมยอดขายและรายการธุรกรรมทั้งหมด</p>
                <Tag color="gold" className="font-bold">สาขา: {selectedBranchLabel}</Tag>
              </div>
            </div>
          </div>
        </div>

        {/* การ์ดสรุปสถิติ (ADMIN เท่านั้น) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm lg:gap-lg mb-lg lg:mb-xl flex-shrink-0 role-admin-only">
          <StatCard icon={<BadgeDollarSign size={24} />} iconBg="#e6f0ff" iconColor="#4b96ff" label="ยอดขายทั้งหมด" value={thbFormat(stats.totalSales)} />
          <StatCard icon={<FileText size={24} />} iconBg="#f3e8ff" iconColor="#a855f7" label="ออเดอร์ทั้งหมด" value={`${stats.ordersCount.toLocaleString('th-TH')} รายการ`} />
          <StatCard icon={<ReceiptText size={24} />} iconBg="#e6f4ea" iconColor="#1e8e3e" label="กำไรสุทธิ" value={thbFormat(stats.totalProfit)} />
          <StatCard icon={<ChartBar size={24} />} iconBg="#ffedd5" iconColor="#f97316" label="เฉลี่ยต่อออเดอร์" value={thbFormat(stats.avgSales)} />
        </div>

        <div className="flex-initial bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/80 flex flex-col mb-8 lg:mb-0 lg:min-h-0">
          {/* Toolbar: ค้นหา + ช่วงวันที่ + ปุ่มลบ */}
          <div className="p-4 lg:p-lg border-b border-outline-variant/30 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-surface/30 flex-shrink-0">
            <div className="flex items-center justify-between gap-3 w-full xl:w-auto">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-headline-sm text-primary flex-shrink-0">รายการล่าสุด</h3>
                <Tag color="gold" className="font-bold">สาขา: {selectedBranchLabel}</Tag>
              </div>
              <Button
                danger
                disabled={!deleteBtnActive}
                onClick={confirmDeleteSelected}
                icon={<Trash2 size={16} />}
                title={deleteBtnActive ? `ลบ ${selected.size} รายการที่เลือก` : 'ลบรายการที่เลือก'}
              >
                {deleteBtnActive ? `ลบ (${selected.size})` : 'ลบ'}
              </Button>
            </div>
            <div className="flex flex-col lg:flex-row items-center gap-sm w-full xl:w-auto">
              <Input
                prefix={<Filter size={18} className="text-on-surface-variant" />}
                value={filterText}
                onChange={(e) => applyFilter(() => setFilterText(e.target.value))}
                placeholder="ค้นหารหัสออเดอร์ หรือ สินค้า..."
                allowClear
                className="w-full lg:w-64 shadow-sm font-body-sm"
              />
              <div className="hidden lg:block h-6 w-px bg-outline-variant/50 mx-xs"></div>
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                <div className="flex items-center lg:justify-start gap-2 w-full lg:w-auto">
                  <label htmlFor="hist-start-date" className="w-[60px] flex-shrink-0 font-body-sm font-semibold text-on-surface-variant whitespace-nowrap">เริ่มต้น:</label>
                  <DatePicker
                    id="hist-start-date"
                    value={startDate ? dayjs(startDate) : null}
                    onChange={(d) => applyFilter(() => setStartDate(d ? d.format('YYYY-MM-DD') : ''))}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    className="flex-1 lg:w-[170px] shadow-sm"
                  />
                </div>
                <div className="flex items-center lg:justify-start gap-2 w-full lg:w-auto">
                  <label htmlFor="hist-end-date" className="w-[60px] flex-shrink-0 font-body-sm font-semibold text-on-surface-variant whitespace-nowrap">สิ้นสุด:</label>
                  <DatePicker
                    id="hist-end-date"
                    value={endDate ? dayjs(endDate) : null}
                    onChange={(d) => applyFilter(() => setEndDate(d ? d.format('YYYY-MM-DD') : ''))}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    className="flex-1 lg:w-[170px] shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table (antd) */}
          <div className="hidden lg:block">
            <Table<OrderGroup>
              rowKey="orderId"
              columns={columns}
              dataSource={pageItems}
              pagination={paginationConfig}
              scroll={{ x: 1180 }}
              rowSelection={{
                selectedRowKeys: Array.from(selected),
                onChange: (keys) => setSelected(new Set(keys as string[])),
                columnWidth: 50,
              }}
              onRow={(record) => ({
                onClick: (e) => {
                  // ไม่เปิด detail เมื่อคลิกที่ checkbox
                  if ((e.target as HTMLElement).closest('.ant-table-selection-column, .ant-checkbox-wrapper')) return
                  setDetailOrderId(record.orderId)
                },
                className: 'cursor-pointer',
              })}
              rowClassName={(record) => (selected.has(record.orderId) ? 'bg-error/[0.04]' : '')}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่พบประวัติการขาย" /> }}
            />
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden flex flex-col gap-sm p-sm bg-background">
            {pageItems.length === 0 ? (
              <div className="p-lg text-center text-on-surface-variant">ไม่พบประวัติการขาย</div>
            ) : (
              pageItems.map((row) => (
                <article
                  key={row.orderId}
                  onClick={() => setDetailOrderId(row.orderId)}
                  className={`bg-surface-container-lowest hover:border-secondary/50 cursor-pointer rounded-xl p-md shadow-sm border border-outline-variant/80 relative flex flex-col gap-2 transition-all duration-200 ${selected.has(row.orderId) ? 'bg-error/[0.04]' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">{row.orderId}</span>
                    <span className="text-[10px] font-semibold text-on-surface-variant/80 bg-surface-container px-2 py-0.5 rounded flex-shrink-0">
                      {formatOrderDate(row.date).split(' | ')[0] || ''}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 mt-0.5">
                      <Checkbox
                        checked={selected.has(row.orderId)}
                        onChange={(e) => toggleSelect(row.orderId, e.target.checked)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-on-surface text-body-md break-words">
                        {row.items.length === 0 ? '-' : (
                          <>
                            {row.items[0].productName}<br />
                            <span className="text-secondary font-bold">x{row.items[0].qty}</span>
                            {row.items.length > 1 && (
                              <span className="text-xs font-semibold text-secondary ml-1"> (+{row.items.length - 1} รายการ)</span>
                            )}
                          </>
                        )}
                      </div>
                      {row.note && (
                        <div className="text-xs text-on-surface-variant bg-surface-container-low p-2 rounded mt-1 border border-outline-variant/30">{row.note}</div>
                      )}
                    </div>
                  </div>
                  <hr className="border-t border-outline-variant/10 my-1" />
                  <div className="flex justify-between items-center w-full pl-6">
                    <div className="font-medium text-xs text-on-surface-variant"><ChannelBadge channel={row.channel} /></div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-secondary text-body-md">{thbFormat(row.totalSales)}</span>
                      <MarginBadge totalSales={row.totalSales} netProfit={row.netProfit} size="sm" />
                    </div>
                  </div>
                </article>
              ))
            )}
            {/* Pagination มือถือ (ตาราง antd ถูกซ่อนบนมือถือ) */}
            <div className="flex justify-center py-3">
              <Pagination {...paginationConfig} size="small" showTotal={undefined} />
            </div>
          </div>
        </div>
      </div>

      {/* ==================== Order Detail Modal ==================== */}
      <Modal
        open={!!detailOrderId}
        onCancel={() => setDetailOrderId(null)}
        centered
        width={512}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary flex-shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="font-headline-sm text-on-surface font-bold">รายละเอียดออเดอร์</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">{detailOrderId ?? '-'}</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button danger block icon={<CircleX size={16} />} onClick={confirmCancelCurrentOrder} className="h-11">
              ยกเลิกออเดอร์
            </Button>
            <Button block onClick={() => setDetailOrderId(null)} className="ant-btn-secondary-solid h-11">
              ปิดหน้าต่าง
            </Button>
          </div>
        }
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
            <div>
              <span className="text-xs text-on-surface-variant block mb-1">วัน-เวลา ทำรายการ</span>
              <span className="font-semibold text-sm text-on-surface">{detailFirst ? formatOrderDate(detailFirst.date, true) : '-'}</span>
            </div>
            <div>
              <span className="text-xs text-on-surface-variant block mb-1">ช่องทางการขาย</span>
              <span className="block mt-0.5">{detailFirst ? <ChannelBadge channel={detailFirst.channel} /> : '-'}</span>
            </div>
            <div className="col-span-2 border-t border-outline-variant/20 pt-2">
              <span className="text-xs text-on-surface-variant block mb-1">สาขา</span>
              <span className="font-semibold text-sm text-on-surface">
                {detailFirst?.branchName ? `${detailFirst.branchName}${detailFirst.branchCode ? ` (${detailFirst.branchCode})` : ''}` : selectedBranchLabel}
              </span>
            </div>
            {detailFirst?.note && detailFirst.note.trim() !== '' && (
              <div className="col-span-2 border-t border-outline-variant/20 pt-2">
                <span className="text-xs text-on-surface-variant block mb-1">หมายเหตุ</span>
                <p className="text-sm text-on-surface bg-white p-2.5 rounded-lg border border-outline-variant/30 min-h-[40px] break-words">{detailFirst.note}</p>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-primary mb-2">รายการสินค้า</h4>
            <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[400px]">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant/30">
                      <th className="py-2.5 px-3 font-extrabold text-on-surface text-left whitespace-nowrap">สินค้า</th>
                      <th className="py-2.5 px-3 font-extrabold text-on-surface text-center w-16 whitespace-nowrap">จำนวน</th>
                      <th className="py-2.5 px-3 font-extrabold text-on-surface text-right w-24 whitespace-nowrap">ราคา/หน่วย</th>
                      <th className="py-2.5 px-3 font-extrabold text-on-surface text-right w-28 whitespace-nowrap">ราคารวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                    {detailItems.map((item) => {
                      const qty = Number(item.qty) || 0
                      const totalSales = Number(item.totalSales) || 0
                      const unitPrice = Number(item.unitPrice) || 0
                      return (
                        <tr key={item.productName} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-on-surface text-left whitespace-nowrap">{item.productName}</td>
                          <td className="py-3 px-3 text-center font-bold text-on-surface whitespace-nowrap">{qty}</td>
                          <td className="py-3 px-3 text-right font-medium text-on-surface-variant whitespace-nowrap">{thbFormat(unitPrice || (qty > 0 ? totalSales / qty : 0))}</td>
                          <td className="py-3 px-3 text-right font-bold text-on-surface whitespace-nowrap">{thbFormat(totalSales)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-2">
            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span>ยอดขายรวม (ก่อนหัก GP)</span>
              <span className="font-bold text-on-surface">{thbFormat(detailSubtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span>ค่าธรรมเนียม GP ({(detailGpRate * 100).toFixed(1)}%)</span>
              <span className="font-bold text-error">{thbFormat(detailGpAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span>ยอดรับหลังหัก GP</span>
              <span className="font-bold text-on-surface">{thbFormat(detailNetRevenue)}</span>
            </div>
            <div className="border-t border-outline-variant/20 my-2 pt-2 flex justify-between items-center text-sm">
              <span className="font-bold text-primary">กำไรสุทธิ</span>
              <span className="font-bold text-secondary text-lg">{thbFormat(detailNetProfit)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ==================== Delete Confirm Modal ==================== */}
      <Modal
        open={deleteConfirm.open}
        onCancel={() => {
          setDeleteErrorMsg('')
          setDeleteConfirm({ open: false, orderIds: [] })
        }}
        centered
        width={384}
        closable={false}
        title={
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-error-container/40 flex items-center justify-center text-error flex-shrink-0">
              <CircleAlert size={22} />
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">ยืนยันการลบประวัติ</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">การดำเนินการนี้ไม่สามารถย้อนกลับได้</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => {
              setDeleteErrorMsg('')
              setDeleteConfirm({ open: false, orderIds: [] })
            }} className="h-11 ant-btn-cancel-soft">
              ยกเลิก
            </Button>
            <Button type="primary" danger block icon={<Trash2 size={16} />} loading={isDeleting} onClick={executeDelete} className="h-11">
              ยืนยันการลบ
            </Button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant mb-3">
          ต้องการลบรายการ <span className="font-bold text-error">{deleteConfirm.orderIds.length} ออเดอร์</span> ออกจากระบบ?
        </p>
        {deleteErrorMsg && <Alert title={deleteErrorMsg} type="error" showIcon className="mb-3 rounded-xl" />}
        <ul className="space-y-2 max-h-48 overflow-y-auto bg-error-container/10 border border-error/15 rounded-xl p-3">
          {deleteDisplayList.map((i) => (
            <li key={i.orderId} className="flex items-center gap-2 text-sm text-on-surface">
              <FileText size={14} className="text-error flex-shrink-0" />
              <span className="font-semibold">{i.orderId}</span> - <span className="truncate max-w-[220px]" title={i.desc}>{i.desc}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}

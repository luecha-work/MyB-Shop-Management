'use client'

import { useMemo, useState } from 'react'
import TablePagination from '@/components/UI/TablePagination'
import { thbFormat, currentMonthRange } from '@/lib/format'

// ==========================================
// Types & Mock Data (รอเชื่อมต่อ Google Sheets ผ่าน Server Action getSalesHistory)
// 1 แถว = สินค้า 1 รายการในออเดอร์ (โครงเดียวกับข้อมูลชีตเดิม)
// ==========================================
type HistoryRow = {
  orderId: string
  date: string
  channel: string
  note: string
  productName: string
  qty: number
  totalSales: number
  netProfit: number
  gpRate: number
}

type OrderGroup = {
  orderId: string
  date: string
  channel: string
  note: string
  items: { productName: string; qty: number; totalSales: number; netProfit: number }[]
  totalSales: number
  netProfit: number
}

function buildMockHistory(): HistoryRow[] {
  const now = new Date()
  const d = (day: number, h: number, m: number) =>
    new Date(now.getFullYear(), now.getMonth(), day, h, m).toISOString()

  return [
    { orderId: 'ORD-A1B2C3D4E5F6', date: d(2, 10, 15), channel: 'Cash (เงินสด)', note: '', productName: 'ข้าวกล่องกะเพราไก่', qty: 2, totalSales: 120, netProfit: 50, gpRate: 0 },
    { orderId: 'ORD-A1B2C3D4E5F6', date: d(2, 10, 15), channel: 'Cash (เงินสด)', note: '', productName: 'น้ำเปล่า 600ml', qty: 1, totalSales: 10, netProfit: 5, gpRate: 0 },
    { orderId: 'ORD-G7H8I9J1K2L3', date: d(5, 12, 40), channel: 'Grab', note: 'ไม่ใส่ผัก', productName: 'ชาไทยเย็น', qty: 3, totalSales: 120, netProfit: 42, gpRate: 0.3 },
    { orderId: 'ORD-M4N5O6P7Q8R9', date: d(9, 17, 5), channel: 'LINE MAN', note: '', productName: 'ผัดไทยกุ้งสด', qty: 1, totalSales: 85, netProfit: 21, gpRate: 0.28 },
    { orderId: 'ORD-M4N5O6P7Q8R9', date: d(9, 17, 5), channel: 'LINE MAN', note: '', productName: 'วุ้นมะพร้าว', qty: 2, totalSales: 40, netProfit: 9, gpRate: 0.28 },
    { orderId: 'ORD-S1T2U3V4W5X6', date: d(12, 9, 30), channel: 'Cash (เงินสด)', note: 'ลูกค้าประจำ', productName: 'หมูปิ้งไม้', qty: 5, totalSales: 60, netProfit: 25, gpRate: 0 },
    { orderId: 'ORD-Y7Z8A9B1C2D3', date: d(15, 13, 20), channel: 'Grab', note: '', productName: 'มาม่าต้มยำทะเล', qty: 1, totalSales: 70, netProfit: 3, gpRate: 0.3 },
    { orderId: 'ORD-E4F5G6H7I8J9', date: d(16, 18, 45), channel: 'Cash (เงินสด)', note: '', productName: 'ส้มตำไทย', qty: 2, totalSales: 90, netProfit: 40, gpRate: 0 },
    { orderId: 'ORD-E4F5G6H7I8J9', date: d(16, 18, 45), channel: 'Cash (เงินสด)', note: '', productName: 'ไก่ทอด', qty: 3, totalSales: 60, netProfit: 24, gpRate: 0 },
  ]
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

// ตรวจสอบไอคอนและสีของแต่ละช่องทางขาย
function ChannelBadge({ channel }: { channel: string }) {
  if (channel === 'Grab') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <span className="material-symbols-outlined text-[16px]">delivery_dining</span> Grab
      </span>
    )
  }
  if (channel === 'LINE MAN') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-500/10 text-teal-600 border border-teal-500/20">
        <span className="material-symbols-outlined text-[16px]">moped</span> LINE MAN
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-500/10 text-slate-700 border border-slate-500/20">
      <span className="material-symbols-outlined text-[16px]">payments</span> หน้าร้าน
    </span>
  )
}

// Badge อัตรากำไร — เขียว ≥15% / เหลือง ≥5% / แดงต่ำกว่านั้น
function MarginBadge({ totalSales, netProfit, size = 'md' }: { totalSales: number; netProfit: number; size?: 'md' | 'sm' }) {
  const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0
  let colorClass: string, icon: string
  if (margin >= 15) { colorClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'; icon = 'trending_up' }
  else if (margin >= 5) { colorClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20'; icon = 'trending_flat' }
  else { colorClass = 'bg-rose-500/10 text-rose-600 border-rose-500/20'; icon = 'trending_down' }

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
        <span className="material-symbols-outlined text-[12px]">{icon}</span>{margin.toFixed(1)}%
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      <span className="material-symbols-outlined text-[14px]">{icon}</span>{margin.toFixed(1)}%
    </span>
  )
}

// การ์ดสรุปสถิติด้านบน (ADMIN เท่านั้น)
function StatCard({ icon, iconBg, iconColor, label, value }: { icon: string; iconBg: string; iconColor: string; label: string; value: string }) {
  return (
    <div className="bg-white p-4 lg:p-5 rounded-xl shadow-card border border-outline-variant/80 flex flex-col justify-between min-h-[140px] lg:min-h-0">
      <div className="flex justify-between items-center mb-4 lg:mb-6">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg, color: iconColor }}>
          <span className="material-symbols-outlined text-[20px] lg:text-[24px]">{icon}</span>
        </div>
      </div>
      <div>
        <span className="font-body-sm lg:font-body-md text-on-surface-variant font-medium block mb-1">{label}</span>
        <span className="text-lg xl:text-[28px] xl:leading-[36px] text-primary font-bold block truncate">{value}</span>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const monthRange = useMemo(() => currentMonthRange(), [])
  const [allData, setAllData] = useState<HistoryRow[]>(() => buildMockHistory())
  const [filterText, setFilterText] = useState('')
  const [startDate, setStartDate] = useState(monthRange.start)
  const [endDate, setEndDate] = useState(monthRange.end)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set()) // เก็บ orderId
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; orderIds: string[] }>({ open: false, orderIds: [] })

  // 1. Group by orderId ก่อน (logic เดิมจาก renderHistoryTable)
  const grouped = useMemo(() => {
    const groups: Record<string, OrderGroup> = {}
    const list: OrderGroup[] = []
    allData.forEach((row) => {
      const id = row.orderId
      if (!groups[id]) {
        groups[id] = { orderId: id, date: row.date, channel: row.channel, note: row.note, items: [], totalSales: 0, netProfit: 0 }
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

  const resetSelection = () => setSelected(new Set())

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
    setDeleteConfirm({ open: true, orderIds: Array.from(selected) })
  }

  // ยกเลิกออเดอร์เดี่ยวจาก Detail Modal
  const confirmCancelCurrentOrder = () => {
    if (!detailOrderId) return
    setDetailOrderId(null)
    setDeleteConfirm({ open: true, orderIds: [detailOrderId] })
  }

  // TODO: เชื่อม Server Action deleteSalesHistory (Google Sheets) แทนการลบใน state
  const executeDelete = () => {
    const ids = new Set(deleteConfirm.orderIds)
    setAllData(allData.filter((r) => !ids.has(r.orderId)))
    resetSelection()
    setDeleteConfirm({ open: false, orderIds: [] })
  }

  // ข้อมูลใน Detail Modal
  const detailItems = useMemo(
    () => (detailOrderId ? allData.filter((h) => String(h.orderId) === String(detailOrderId)) : []),
    [allData, detailOrderId],
  )
  const detailFirst = detailItems[0]
  const detailSubtotal = detailItems.reduce((s, i) => s + (Number(i.totalSales) || 0), 0)
  const detailNetProfit = detailItems.reduce((s, i) => s + (Number(i.netProfit) || 0), 0)
  const detailGpRate = Number(detailFirst?.gpRate) || 0
  const detailGpAmount = detailSubtotal * detailGpRate
  const detailNetRevenue = detailSubtotal - detailGpAmount

  // รายการที่จะลบ (แสดงใน Delete Confirm Modal)
  const deleteDisplayList = deleteConfirm.orderIds.map((orderId) => ({
    orderId,
    desc: allData.filter((h) => String(h.orderId) === String(orderId)).map((m) => m.productName).join(', '),
  }))

  const deleteBtnActive = selected.size > 0

  return (
    <>
      <div className="h-full flex flex-col p-margin-mobile pb-24 md:p-margin-desktop md:pb-28 lg:pb-margin-desktop w-full overflow-y-auto bg-background">
        {/* Page Header */}
        <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl flex-shrink-0">
          <div className="flex items-stretch gap-4">
            <div className="w-[6px] bg-gradient-to-b from-secondary to-secondary/30 rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(118,90,36,0.2)]"></div>
            <div>
              <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-xs">ประวัติการขาย</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-0.5">ภาพรวมยอดขายและรายการธุรกรรมทั้งหมด</p>
            </div>
          </div>
        </div>

        {/* การ์ดสรุปสถิติ (ADMIN เท่านั้น) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm lg:gap-lg mb-lg lg:mb-xl flex-shrink-0 role-admin-only">
          <StatCard icon="payments" iconBg="#e6f0ff" iconColor="#4b96ff" label="ยอดขายทั้งหมด" value={thbFormat(stats.totalSales)} />
          <StatCard icon="receipt_long" iconBg="#f3e8ff" iconColor="#a855f7" label="ออเดอร์ทั้งหมด" value={`${stats.ordersCount.toLocaleString('th-TH')} รายการ`} />
          <StatCard icon="savings" iconBg="#e6f4ea" iconColor="#1e8e3e" label="กำไรสุทธิ" value={thbFormat(stats.totalProfit)} />
          <StatCard icon="analytics" iconBg="#ffedd5" iconColor="#f97316" label="เฉลี่ยต่อออเดอร์" value={thbFormat(stats.avgSales)} />
        </div>

        <div className="flex-initial bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/80 flex flex-col mb-8 lg:mb-0 lg:overflow-hidden lg:min-h-0">
          {/* Toolbar: ค้นหา + ช่วงวันที่ */}
          <div className="p-4 lg:p-lg border-b border-outline-variant/30 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-surface/30 flex-shrink-0">
            <div className="flex items-center justify-between w-full xl:w-auto">
              <h3 className="font-headline-sm text-primary flex-shrink-0">รายการล่าสุด</h3>
              {/* Mobile Delete Button */}
              <button
                onClick={confirmDeleteSelected}
                disabled={!deleteBtnActive}
                className={`lg:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-rose-500/10 text-error ${deleteBtnActive ? 'opacity-100 cursor-pointer hover:bg-rose-500/20' : 'opacity-30 cursor-not-allowed'}`}
                title={deleteBtnActive ? `ลบ ${selected.size} รายการที่เลือก` : 'ลบรายการที่เลือก'}
              >
                <span className="material-symbols-outlined text-[22px]">delete</span>
              </button>
            </div>
            <div className="flex flex-col lg:flex-row items-center gap-sm w-full xl:w-auto">
              <div className="relative w-full lg:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">filter_list</span>
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => applyFilter(() => setFilterText(e.target.value))}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all shadow-sm"
                  placeholder="ค้นหารหัสออเดอร์ หรือ สินค้า..."
                />
              </div>
              <div className="hidden lg:block h-6 w-px bg-outline-variant/50 mx-xs"></div>
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                <div className="flex items-center lg:justify-start gap-2 w-full lg:w-auto">
                  <label htmlFor="hist-start-date" className="w-[60px] flex-shrink-0 font-body-sm font-semibold text-on-surface-variant whitespace-nowrap">เริ่มต้น:</label>
                  <input
                    id="hist-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => applyFilter(() => setStartDate(e.target.value))}
                    className="h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface flex-1 lg:w-[170px] shadow-sm"
                  />
                </div>
                <div className="flex items-center lg:justify-start gap-2 w-full lg:w-auto">
                  <label htmlFor="hist-end-date" className="w-[60px] flex-shrink-0 font-body-sm font-semibold text-on-surface-variant whitespace-nowrap">สิ้นสุด:</label>
                  <input
                    id="hist-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => applyFilter(() => setEndDate(e.target.value))}
                    className="h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface flex-1 lg:w-[170px] shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[1330px] table-fixed text-left border-collapse">
              <thead className="sticky top-0 bg-surface-container border-b border-outline-variant/40 z-10">
                <tr>
                  <th className="py-4 pl-5 pr-2 text-center w-[50px]">
                    <button
                      onClick={confirmDeleteSelected}
                      disabled={!deleteBtnActive}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${deleteBtnActive ? 'text-error hover:bg-error-container/30 cursor-pointer' : 'text-on-surface-variant opacity-30 cursor-not-allowed'}`}
                      title={deleteBtnActive ? `ลบ ${selected.size} รายการที่เลือก` : 'ลบรายการที่เลือก'}
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </th>
                  <th className="w-[220px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase whitespace-nowrap">รหัสรายการ / วัน-เวลา</th>
                  <th className="w-[430px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase whitespace-nowrap">รายการสินค้า</th>
                  <th className="w-[130px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase whitespace-nowrap">ช่องทางการขาย</th>
                  <th className="w-[130px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase text-right whitespace-nowrap">ยอดขายสุทธิ</th>
                  <th className="w-[110px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase text-center whitespace-nowrap">อัตรากำไร</th>
                  <th className="w-[130px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase whitespace-nowrap">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                {pageItems.length === 0 ? (
                  <tr><td colSpan={7} className="p-lg text-center text-on-surface-variant">ไม่พบประวัติการขาย</td></tr>
                ) : (
                  pageItems.map((row) => (
                    <tr
                      key={row.orderId}
                      onClick={() => setDetailOrderId(row.orderId)}
                      className={`hover:bg-primary/[0.04] cursor-pointer transition-colors duration-150 border-b border-outline-variant/10 ${selected.has(row.orderId) ? 'bg-error/[0.04]' : ''}`}
                    >
                      <td className="py-4 pl-5 pr-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.orderId)}
                          onChange={(e) => toggleSelect(row.orderId, e.target.checked)}
                          className="w-4 h-4 rounded-[4px] border-outline-variant text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-primary text-body-md">{row.orderId}</div>
                        <div className="text-xs text-on-surface-variant mt-0.5">{formatOrderDate(row.date)}</div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-on-surface text-body-md">
                        {row.items.length === 0 ? '-' : (
                          <>
                            {row.items[0].productName} <span className="text-xs font-medium text-on-surface-variant/80 ml-1">x{row.items[0].qty}</span>
                            {row.items.length > 1 && (
                              <span className="text-xs font-semibold text-secondary ml-1.5">(และอีก {row.items.length - 1} รายการ)</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-4 px-6"><ChannelBadge channel={row.channel} /></td>
                      <td className="py-4 px-6 text-right font-bold text-body-md text-secondary">{thbFormat(row.totalSales)}</td>
                      <td className="py-4 px-4 text-center"><MarginBadge totalSales={row.totalSales} netProfit={row.netProfit} /></td>
                      <td className="py-4 px-6 text-on-surface-variant truncate max-w-[130px]" title={row.note || ''}>{row.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                      <input
                        type="checkbox"
                        checked={selected.has(row.orderId)}
                        onChange={(e) => toggleSelect(row.orderId, e.target.checked)}
                        className="w-4 h-4 rounded-[4px] border-outline-variant text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
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
          </div>

          <div className="flex-shrink-0">
            <TablePagination
              totalItems={filtered.length}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => { setCurrentPage(p); resetSelection() }}
              onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); resetSelection() }}
            />
          </div>
        </div>
      </div>

      {/* ==================== Order Detail Modal ==================== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${detailOrderId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setDetailOrderId(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className={`relative z-10 w-full max-w-lg bg-surface rounded-2xl shadow-premium overflow-hidden flex flex-col transition-transform duration-200 max-h-[85vh] ${detailOrderId ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary flex-shrink-0">
                <span className="material-symbols-outlined text-[22px] filled">receipt_long</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-on-surface font-bold">รายละเอียดออเดอร์</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{detailOrderId ?? '-'}</p>
              </div>
            </div>
            <button
              onClick={() => setDetailOrderId(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
              <div>
                <span className="text-xs text-on-surface-variant block mb-1">วัน-เวลา ทำรายการ</span>
                <span className="font-semibold text-sm text-on-surface">{detailFirst ? formatOrderDate(detailFirst.date, true) : '-'}</span>
              </div>
              <div>
                <span className="text-xs text-on-surface-variant block mb-1">ช่องทางการขาย</span>
                <span className="block mt-0.5">{detailFirst ? <ChannelBadge channel={detailFirst.channel} /> : '-'}</span>
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
                        return (
                          <tr key={item.productName} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-3 font-semibold text-on-surface text-left whitespace-nowrap">{item.productName}</td>
                            <td className="py-3 px-3 text-center font-bold text-on-surface whitespace-nowrap">{qty}</td>
                            <td className="py-3 px-3 text-right font-medium text-on-surface-variant whitespace-nowrap">{thbFormat(qty > 0 ? totalSales / qty : 0)}</td>
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

          <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20 bg-surface/30">
            <button
              onClick={confirmCancelCurrentOrder}
              className="w-full h-11 rounded-xl border border-error text-error font-body-md font-medium hover:bg-error-container/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              ยกเลิกออเดอร์
            </button>
            <button
              onClick={() => setDetailOrderId(null)}
              className="w-full h-11 rounded-xl bg-secondary text-on-secondary font-body-md font-medium hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* ==================== Delete Confirm Modal ==================== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${deleteConfirm.open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setDeleteConfirm({ open: false, orderIds: [] })} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className={`relative z-10 w-full max-w-sm bg-surface rounded-2xl shadow-premium overflow-hidden flex flex-col transition-transform duration-200 ${deleteConfirm.open ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center gap-3 px-6 pt-6 pb-4">
            <div className="w-11 h-11 rounded-xl bg-error-container/40 flex items-center justify-center text-error flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">delete_forever</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-on-surface">ยืนยันการลบประวัติ</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
          </div>

          <div className="px-6 pb-4">
            <p className="text-sm text-on-surface-variant mb-3">
              ต้องการลบรายการ <span className="font-bold text-error">{deleteConfirm.orderIds.length} ออเดอร์</span> ออกจากระบบ?
            </p>
            <ul className="space-y-2 max-h-48 overflow-y-auto bg-error-container/10 border border-error/15 rounded-xl p-3">
              {deleteDisplayList.map((i) => (
                <li key={i.orderId} className="flex items-center gap-2 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-error flex-shrink-0">receipt_long</span>
                  <span className="font-semibold">{i.orderId}</span> - <span className="truncate max-w-[220px]" title={i.desc}>{i.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20">
            <button
              onClick={() => setDeleteConfirm({ open: false, orderIds: [] })}
              className="flex-1 h-11 rounded-xl border border-outline-variant text-on-surface-variant font-body-md font-medium hover:bg-surface-container transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={executeDelete}
              className="flex-1 h-11 rounded-xl bg-error text-on-error font-body-md font-medium hover:bg-error/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              ยืนยันการลบ
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

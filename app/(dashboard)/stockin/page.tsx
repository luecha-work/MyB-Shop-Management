'use client'

import { useMemo, useState } from 'react'
import TablePagination from '@/components/UI/TablePagination'
import { currentMonthRange, formatNum } from '@/lib/format'

// ==========================================
// Types & Mock Data (รอเชื่อมต่อ Google Sheets ผ่าน Server Action)
// โครงข้อมูลเดิม: [Timestamp, ProductId, ProductName, Quantity, Restock, Note]
// ==========================================
type StockInRow = {
  date: string
  productId: string
  productName: string
  qty: number
  note: string
}

function buildMockStockIn(): StockInRow[] {
  const now = new Date()
  const d = (day: number, h: number, m: number) =>
    new Date(now.getFullYear(), now.getMonth(), day, h, m).toISOString()

  return [
    { date: d(1, 8, 30), productId: 'P001', productName: 'น้ำเปล่า 600ml', qty: 72, note: 'สต็อกเริ่มต้นเดือน' },
    { date: d(1, 8, 45), productId: 'P002', productName: 'กาแฟเย็น', qty: 30, note: '' },
    { date: d(3, 9, 10), productId: 'P003', productName: 'ข้าวกล่องกะเพราไก่', qty: 20, note: 'รอบเช้า' },
    { date: d(6, 14, 0), productId: 'P004', productName: 'ไก่ทอด', qty: 40, note: '' },
    { date: d(9, 10, 20), productId: 'P005', productName: 'ชาไทยเย็น', qty: 25, note: '' },
    { date: d(12, 11, 5), productId: 'P006', productName: 'หมูปิ้งไม้', qty: 50, note: 'สั่งเพิ่มจากซัพพลายเออร์' },
    { date: d(15, 16, 40), productId: 'P007', productName: 'โดนัทช็อกโกแลต', qty: 20, note: '' },
  ]
}

const rowKey = (row: StockInRow) => JSON.stringify({ date: row.date, productName: row.productName })

// ฟอร์แมตวันที่ เช่น "1 ก.ค. 2569 08:30" (logic เดิมจาก updateStockInUI)
const formatStockInDate = (date: string) =>
  new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function StockInPage() {
  const monthRange = useMemo(() => currentMonthRange(), [])
  const [allData, setAllData] = useState<StockInRow[]>(() => buildMockStockIn())
  const [filterText, setFilterText] = useState('')
  const [startDate, setStartDate] = useState(monthRange.start)
  const [endDate, setEndDate] = useState(monthRange.end)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set()) // เก็บ key {date, productName}
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // กรองตามชื่อสินค้า + ช่วงวันที่ (logic เดิมจาก renderStockInTable)
  const filtered = useMemo(() => {
    const query = filterText.toLowerCase().trim()
    const sDate = startDate ? new Date(startDate) : null
    if (sDate) sDate.setHours(0, 0, 0, 0)
    const eDate = endDate ? new Date(endDate) : null
    if (eDate) eDate.setHours(23, 59, 59, 999)

    return allData.filter((h) => {
      let matchName = true
      if (query && h.productName) {
        matchName = String(h.productName).toLowerCase().includes(query)
      }
      let matchDate = true
      if (sDate || eDate) {
        const rowDate = new Date(h.date)
        if (sDate && rowDate < sDate) matchDate = false
        if (eDate && rowDate > eDate) matchDate = false
      }
      return matchName && matchDate
    })
  }, [allData, filterText, startDate, endDate])

  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filtered.slice(startIndex, startIndex + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  const resetSelection = () => setSelected(new Set())

  const applyFilter = (fn: () => void) => {
    fn()
    setCurrentPage(1)
    resetSelection()
  }

  const toggleSelect = (row: StockInRow, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(rowKey(row))
    else next.delete(rowKey(row))
    setSelected(next)
  }

  // TODO: เชื่อม Server Action deleteStockInRecords (Google Sheets) แทนการลบใน state
  const executeDelete = () => {
    setAllData(allData.filter((r) => !selected.has(rowKey(r))))
    resetSelection()
    setDeleteConfirmOpen(false)
  }

  const selectedRows = allData.filter((r) => selected.has(rowKey(r)))
  const deleteBtnActive = selected.size > 0

  return (
    <>
      <div className="h-full flex flex-col p-margin-mobile pb-24 md:p-margin-desktop md:pb-28 lg:pb-margin-desktop w-full overflow-y-auto bg-background">
        {/* Page Header */}
        <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl flex-shrink-0">
          <div className="flex items-stretch gap-4">
            <div className="w-[6px] bg-gradient-to-b from-secondary to-secondary/30 rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(118,90,36,0.2)]"></div>
            <div>
              <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-xs">บันทึกการรับสินค้าเข้าคลัง</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-0.5">การรับสินค้าเข้าสต็อกทั้งหมด</p>
            </div>
          </div>
        </div>

        <div className="flex-initial bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/80 flex flex-col mb-8 lg:mb-0 lg:overflow-hidden lg:min-h-0">
          {/* Toolbar: ค้นหา + ช่วงวันที่ */}
          <div className="p-4 lg:p-lg border-b border-outline-variant/30 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-surface/30 flex-shrink-0">
            <div className="flex items-center justify-between w-full xl:w-auto">
              <h3 className="font-headline-sm text-primary flex-shrink-0">รายการประวัติการรับเข้า</h3>
              {/* Mobile Delete Button */}
              <button
                onClick={() => deleteBtnActive && setDeleteConfirmOpen(true)}
                disabled={!deleteBtnActive}
                className={`lg:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-rose-500/10 text-error ${deleteBtnActive ? 'opacity-100 cursor-pointer hover:bg-rose-500/20' : 'opacity-30 cursor-not-allowed'}`}
                title={deleteBtnActive ? `ลบ ${selected.size} รายการที่เลือก` : 'ลบรายการที่เลือก'}
              >
                <span className="material-symbols-outlined text-[22px]">delete</span>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-sm w-full xl:w-auto">
              <div className="relative w-full lg:w-48">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">filter_list</span>
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => applyFilter(() => setFilterText(e.target.value))}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all shadow-sm"
                  placeholder="ค้นหาชื่อสินค้า..."
                />
              </div>
              <div className="hidden lg:block h-6 w-px bg-outline-variant/50 mx-xs"></div>
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                <div className="flex items-center lg:justify-start gap-2 w-full lg:w-auto">
                  <label htmlFor="stockin-start-date" className="w-[60px] flex-shrink-0 font-body-sm font-semibold text-on-surface-variant whitespace-nowrap">เริ่มต้น:</label>
                  <input
                    id="stockin-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => applyFilter(() => setStartDate(e.target.value))}
                    className="h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface flex-1 lg:w-[170px] shadow-sm"
                  />
                </div>
                <div className="flex items-center lg:justify-start gap-2 w-full lg:w-auto">
                  <label htmlFor="stockin-end-date" className="w-[60px] flex-shrink-0 font-body-sm font-semibold text-on-surface-variant whitespace-nowrap">สิ้นสุด:</label>
                  <input
                    id="stockin-end-date"
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
            <table className="w-full min-w-[1000px] table-fixed text-left border-collapse">
              <thead className="sticky top-0 bg-surface-container border-b border-outline-variant/40 z-10">
                <tr>
                  <th className="py-4 pl-5 pr-2 text-center w-[50px]">
                    <button
                      onClick={() => deleteBtnActive && setDeleteConfirmOpen(true)}
                      disabled={!deleteBtnActive}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${deleteBtnActive ? 'text-error hover:bg-error-container/30 cursor-pointer' : 'text-on-surface-variant opacity-30 cursor-not-allowed'}`}
                      title={deleteBtnActive ? `ลบ ${selected.size} รายการที่เลือก` : 'ลบรายการที่เลือก'}
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </th>
                  <th className="w-[220px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase whitespace-nowrap">วันที่/เวลา</th>
                  <th className="w-[350px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase whitespace-nowrap">สินค้า</th>
                  <th className="w-[150px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase text-center whitespace-nowrap">จำนวนที่รับเข้า</th>
                  <th className="w-[230px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase whitespace-nowrap">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                {pageItems.length === 0 ? (
                  <tr><td colSpan={5} className="p-lg text-center text-on-surface-variant">ไม่มีประวัติการรับสินค้าเข้าสต็อก</td></tr>
                ) : (
                  pageItems.map((row) => (
                    <tr key={rowKey(row)} className={`hover:bg-surface-container-highest transition-colors group ${selected.has(rowKey(row)) ? 'bg-error/[0.04]' : ''}`}>
                      <td className="py-3 pl-5 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(rowKey(row))}
                          onChange={(e) => toggleSelect(row, e.target.checked)}
                          className="w-4 h-4 rounded-[4px] border-outline-variant text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-6 text-on-surface whitespace-nowrap">{formatStockInDate(row.date)}</td>
                      <td className="py-3 px-6 text-on-surface font-medium">{row.productName || '-'}</td>
                      <td className="py-3 px-6 text-secondary font-bold text-center">{formatNum(row.qty)}</td>
                      <td className="py-3 px-6 text-on-surface-variant">{row.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden flex flex-col gap-sm p-sm bg-background">
            {pageItems.length === 0 ? (
              <div className="p-lg text-center text-on-surface-variant bg-surface-container-lowest rounded-xl border border-outline-variant/50">ไม่มีประวัติการรับสินค้าเข้าสต็อก</div>
            ) : (
              pageItems.map((row) => (
                <div
                  key={rowKey(row)}
                  className={`bg-surface-container-lowest rounded-xl p-4 shadow-sm border relative flex flex-col gap-2 transition-all duration-200 ${selected.has(rowKey(row)) ? 'bg-error/[0.04] border-error/30' : 'border-outline-variant/80'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">{formatStockInDate(row.date)}</span>
                    <span className="text-xs font-bold bg-secondary-container text-secondary px-2 py-0.5 rounded flex-shrink-0">+{formatNum(row.qty)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={selected.has(rowKey(row))}
                        onChange={(e) => toggleSelect(row, e.target.checked)}
                        className="w-4 h-4 rounded-[4px] border-outline-variant text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-on-surface text-body-md break-words">{row.productName || '-'}</div>
                      {row.note && (
                        <div className="text-xs text-on-surface-variant bg-surface-container-low p-2 rounded mt-1 border border-outline-variant/30">{row.note}</div>
                      )}
                    </div>
                  </div>
                  <hr className="border-t border-outline-variant/10 my-1" />
                  <div className="flex justify-between items-center w-full pl-6">
                    <div className="font-medium text-xs text-on-surface-variant">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <span className="material-symbols-outlined text-[14px]">inventory</span> รับเข้าคลัง
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">สำเร็จ</span>
                  </div>
                </div>
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

      {/* ==================== Delete Confirm Modal ==================== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${deleteConfirmOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setDeleteConfirmOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className={`relative z-10 w-full max-w-sm bg-surface rounded-2xl shadow-premium overflow-hidden flex flex-col transition-transform duration-200 ${deleteConfirmOpen ? 'scale-100' : 'scale-95'}`}>
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
              ต้องการลบประวัติการรับเข้าคลัง <span className="font-bold text-error">{selected.size} รายการ</span> ออกจากระบบ?
            </p>
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg max-h-32 overflow-y-auto p-2 no-scrollbar">
              <ul className="space-y-1.5">
                {selectedRows.map((r) => (
                  <li key={rowKey(r)} className="flex items-center gap-2 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-error flex-shrink-0">inventory</span>
                    {r.productName} ({new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-surface px-6 py-4 flex gap-3 border-t border-outline-variant/30">
            <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 h-11 rounded-xl border border-outline-variant text-on-surface-variant font-body-md font-medium hover:bg-surface-container-low transition-colors">
              ยกเลิก
            </button>
            <button onClick={executeDelete} className="flex-1 h-11 rounded-xl bg-error text-on-error font-body-md font-medium hover:bg-error/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">delete</span> ยืนยันการลบ
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

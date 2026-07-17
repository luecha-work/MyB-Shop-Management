'use client'

// ==========================================
// ส่วนควบคุมการเปลี่ยนหน้าแบบตาราง (Inventory / History / StockIn)
// ดีไซน์ตามโมเดล Flowbite พร้อมปุ่มตัวเลขและ ellipses — port จาก renderPaginationControls ใน script.html
// ==========================================

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 30]

export default function TablePagination({
  totalItems,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: {
  totalItems: number
  currentPage: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const btnSizeClass = 'w-8 h-8 sm:w-10 sm:h-10 text-xs'

  const jumpToPage = (value: string) => {
    const page = parseInt(value, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) onPageChange(page)
  }

  // กำหนดปุ่มเลขหน้าที่จะแสดง (รองรับ ellipses ...)
  let pages: (number | '...')[]
  if (totalPages <= 5) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  } else if (currentPage <= 3) {
    pages = [1, 2, 3, 4, '...', totalPages]
  } else if (currentPage >= totalPages - 2) {
    pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  } else {
    pages = [1, currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  return (
    <nav
      className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-surface border-t border-outline-variant/30 w-full rounded-b-xl shadow-[0_-1px_3px_rgba(0,0,0,0.02)]"
      aria-label="Table navigation"
    >
      {/* ฝั่งซ้าย: ตัวเลือกแสดงรายการต่อหน้า */}
      <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-on-surface-variant w-full sm:w-auto">
        <span>แสดง</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(parseInt(e.target.value, 10))}
          className="w-20 bg-surface-container-lowest border border-outline-variant/80 rounded-lg px-2 py-1 text-on-surface font-bold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all cursor-pointer shadow-sm text-xs"
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span>รายการ</span>
      </div>

      {/* ฝั่งขวา: จำนวนรวม และปุ่มนำทาง */}
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-4 w-full sm:w-auto">
        <span className="text-xs font-semibold text-on-surface-variant text-center sm:text-right block">
          แสดง{' '}
          <span className="font-bold text-on-surface">
            {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}
          </span>{' '}
          จาก <span className="font-bold text-on-surface">{totalItems}</span> รายการ
        </span>
        <ul className="flex -space-x-px justify-center items-center">
          <li>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`flex items-center justify-center text-on-surface bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:hover:bg-surface-container border border-outline-variant/40 font-bold rounded-s-lg ${btnSizeClass} transition-colors`}
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px] select-none pointer-events-none">chevron_left</span>
            </button>
          </li>
          {pages.map((p, i) => (
            <li key={`${p}-${i}`}>
              {p === '...' ? (
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { jumpToPage(e.currentTarget.value); e.currentTarget.value = '' }
                  }}
                  onBlur={(e) => { jumpToPage(e.currentTarget.value); e.currentTarget.value = '' }}
                  placeholder="..."
                  className={`flex items-center justify-center text-center text-on-surface-variant bg-surface-container hover:bg-surface-container-high border-2 border-outline-variant/60 font-bold transition-colors placeholder:text-on-surface-variant/50 placeholder:font-bold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${btnSizeClass} px-1`}
                />
              ) : p === currentPage ? (
                <button className={`flex items-center justify-center text-secondary bg-secondary-container/30 box-border border border-outline-variant/40 font-bold ${btnSizeClass}`}>
                  {p}
                </button>
              ) : (
                <button
                  onClick={() => onPageChange(p)}
                  className={`flex items-center justify-center text-on-surface-variant bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 font-semibold transition-colors ${btnSizeClass}`}
                >
                  {p}
                </button>
              )}
            </li>
          ))}
          <li>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`flex items-center justify-center text-on-surface bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:hover:bg-surface-container border border-outline-variant/40 font-bold rounded-e-lg ${btnSizeClass} transition-colors`}
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px] select-none pointer-events-none">chevron_right</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}

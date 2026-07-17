'use client'

import { useMemo, useState } from 'react'
import { Button, Checkbox, DatePicker, Empty, Input, Modal, Pagination, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  InboxOutlined,
} from '@ant-design/icons'
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

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 30]

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
  const columns: TableColumnsType<StockInRow> = [
    {
      title: 'วันที่/เวลา',
      dataIndex: 'date',
      key: 'date',
      width: 220,
      render: (val: string) => <span className="text-on-surface whitespace-nowrap">{formatStockInDate(val)}</span>,
    },
    {
      title: 'สินค้า',
      dataIndex: 'productName',
      key: 'productName',
      width: 350,
      render: (val: string) => <span className="text-on-surface font-medium">{val || '-'}</span>,
    },
    {
      title: 'จำนวนที่รับเข้า',
      dataIndex: 'qty',
      key: 'qty',
      width: 150,
      align: 'center',
      render: (val: number) => <span className="text-secondary font-bold">{formatNum(val)}</span>,
    },
    {
      title: 'หมายเหตุ',
      dataIndex: 'note',
      key: 'note',
      width: 230,
      render: (val: string) => <span className="text-on-surface-variant">{val || '-'}</span>,
    },
  ]

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

        <div className="flex-initial bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/80 flex flex-col mb-8 lg:mb-0 lg:min-h-0">
          {/* Toolbar: ค้นหา + ช่วงวันที่ + ปุ่มลบ */}
          <div className="p-4 lg:p-lg border-b border-outline-variant/30 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-surface/30 flex-shrink-0">
            <div className="flex items-center justify-between gap-3 w-full xl:w-auto">
              <h3 className="font-headline-sm text-primary flex-shrink-0">รายการประวัติการรับเข้า</h3>
              <Button
                danger
                disabled={!deleteBtnActive}
                onClick={() => setDeleteConfirmOpen(true)}
                icon={<DeleteOutlined />}
                title={deleteBtnActive ? `ลบ ${selected.size} รายการที่เลือก` : 'ลบรายการที่เลือก'}
              >
                {deleteBtnActive ? `ลบ (${selected.size})` : 'ลบ'}
              </Button>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-sm w-full xl:w-auto">
              <Input
                prefix={<FilterOutlined className="text-on-surface-variant" />}
                value={filterText}
                onChange={(e) => applyFilter(() => setFilterText(e.target.value))}
                placeholder="ค้นหาชื่อสินค้า..."
                allowClear
                className="w-full lg:w-48 shadow-sm font-body-sm"
              />
              <div className="hidden lg:block h-6 w-px bg-outline-variant/50 mx-xs"></div>
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                <div className="flex items-center lg:justify-start gap-2 w-full lg:w-auto">
                  <label htmlFor="stockin-start-date" className="w-[60px] flex-shrink-0 font-body-sm font-semibold text-on-surface-variant whitespace-nowrap">เริ่มต้น:</label>
                  <DatePicker
                    id="stockin-start-date"
                    value={startDate ? dayjs(startDate) : null}
                    onChange={(d) => applyFilter(() => setStartDate(d ? d.format('YYYY-MM-DD') : ''))}
                    format="DD/MM/YYYY"
                    className="flex-1 lg:w-[170px] shadow-sm"
                  />
                </div>
                <div className="flex items-center lg:justify-start gap-2 w-full lg:w-auto">
                  <label htmlFor="stockin-end-date" className="w-[60px] flex-shrink-0 font-body-sm font-semibold text-on-surface-variant whitespace-nowrap">สิ้นสุด:</label>
                  <DatePicker
                    id="stockin-end-date"
                    value={endDate ? dayjs(endDate) : null}
                    onChange={(d) => applyFilter(() => setEndDate(d ? d.format('YYYY-MM-DD') : ''))}
                    format="DD/MM/YYYY"
                    className="flex-1 lg:w-[170px] shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table (antd) */}
          <div className="hidden lg:block">
            <Table<StockInRow>
              rowKey={rowKey}
              columns={columns}
              dataSource={pageItems}
              pagination={paginationConfig}
              scroll={{ x: 1000 }}
              rowSelection={{
                selectedRowKeys: Array.from(selected),
                onChange: (keys) => setSelected(new Set(keys as string[])),
                columnWidth: 50,
              }}
              rowClassName={(record) => (selected.has(rowKey(record)) ? 'bg-error/[0.04]' : '')}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีประวัติการรับสินค้าเข้าสต็อก" /> }}
            />
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
                      <Checkbox
                        checked={selected.has(rowKey(row))}
                        onChange={(e) => toggleSelect(row, e.target.checked)}
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
                        <InboxOutlined className="text-[12px]" /> รับเข้าคลัง
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">สำเร็จ</span>
                  </div>
                </div>
              ))
            )}
            {/* Pagination มือถือ (ตาราง antd ถูกซ่อนบนมือถือ) */}
            <div className="flex justify-center py-3">
              <Pagination {...paginationConfig} size="small" showTotal={undefined} />
            </div>
          </div>
        </div>
      </div>

      {/* ==================== Delete Confirm Modal ==================== */}
      <Modal
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        centered
        width={384}
        closable={false}
        title={
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-error-container/40 flex items-center justify-center text-error flex-shrink-0">
              <ExclamationCircleOutlined className="text-[22px]" />
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">ยืนยันการลบประวัติ</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">การดำเนินการนี้ไม่สามารถย้อนกลับได้</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => setDeleteConfirmOpen(false)} className="h-11">ยกเลิก</Button>
            <Button type="primary" danger block icon={<DeleteOutlined />} onClick={executeDelete} className="h-11">
              ยืนยันการลบ
            </Button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant mb-3">
          ต้องการลบประวัติการรับเข้าคลัง <span className="font-bold text-error">{selected.size} รายการ</span> ออกจากระบบ?
        </p>
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg max-h-32 overflow-y-auto p-2 no-scrollbar">
          <ul className="space-y-1.5">
            {selectedRows.map((r) => (
              <li key={rowKey(r)} className="flex items-center gap-2 text-sm text-on-surface">
                <InboxOutlined className="text-[14px] text-error flex-shrink-0" />
                {r.productName} ({new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import TablePagination from '@/components/UI/TablePagination'
import { thbFormat, formatNum } from '@/lib/format'

// ==========================================
// Types & Mock Data (รอเชื่อมต่อ Google Sheets ผ่าน Server Action getProducts)
// ==========================================
type Product = {
  name: string
  cost: number
  priceCash: number
  priceGrab: number
  priceLineman: number
  currentStock: number
  minStock: number
  stockIn: number
  status: string
  image: string
}

const FALLBACK_IMG = 'https://placehold.co/400x400/eceef0/7c839b?text=No+Image'

const MOCK_PRODUCTS: Product[] = [
  { name: 'กาแฟเย็น', cost: 15, priceCash: 30, priceGrab: 40, priceLineman: 38, currentStock: 20, minStock: 5, stockIn: 30, status: 'Active', image: FALLBACK_IMG },
  { name: 'ข้าวกล่องกะเพราไก่', cost: 35, priceCash: 60, priceGrab: 75, priceLineman: 72, currentStock: 12, minStock: 5, stockIn: 20, status: 'Active', image: FALLBACK_IMG },
  { name: 'ข้าวเหนียวหมูปิ้ง', cost: 18, priceCash: 30, priceGrab: 40, priceLineman: 38, currentStock: 15, minStock: 5, stockIn: 20, status: 'Active', image: FALLBACK_IMG },
  { name: 'ไก่ทอด', cost: 12, priceCash: 20, priceGrab: 28, priceLineman: 26, currentStock: 30, minStock: 10, stockIn: 40, status: 'Active', image: FALLBACK_IMG },
  { name: 'ชาไทยเย็น', cost: 14, priceCash: 30, priceGrab: 40, priceLineman: 38, currentStock: 18, minStock: 5, stockIn: 25, status: 'Active', image: FALLBACK_IMG },
  { name: 'เฉาก๊วยนมสด', cost: 10, priceCash: 25, priceGrab: 34, priceLineman: 32, currentStock: 10, minStock: 5, stockIn: 15, status: 'Active', image: FALLBACK_IMG },
  { name: 'แซนด์วิชแฮมชีส', cost: 22, priceCash: 39, priceGrab: 52, priceLineman: 49, currentStock: 8, minStock: 10, stockIn: 20, status: 'Active', image: FALLBACK_IMG },
  { name: 'น้ำเปล่า 600ml', cost: 5, priceCash: 10, priceGrab: 15, priceLineman: 14, currentStock: 48, minStock: 24, stockIn: 72, status: 'Active', image: FALLBACK_IMG },
  { name: 'นมเย็น', cost: 14, priceCash: 30, priceGrab: 40, priceLineman: 38, currentStock: 0, minStock: 5, stockIn: 20, status: 'Out of Stock', image: FALLBACK_IMG },
  { name: 'โดนัทช็อกโกแลต', cost: 12, priceCash: 25, priceGrab: 34, priceLineman: 32, currentStock: 14, minStock: 6, stockIn: 20, status: 'Active', image: FALLBACK_IMG },
  { name: 'ผัดไทยกุ้งสด', cost: 40, priceCash: 70, priceGrab: 89, priceLineman: 85, currentStock: 9, minStock: 5, stockIn: 15, status: 'Active', image: FALLBACK_IMG },
  { name: 'ยำมาม่า', cost: 25, priceCash: 45, priceGrab: 58, priceLineman: 55, currentStock: 7, minStock: 8, stockIn: 15, status: 'Active', image: FALLBACK_IMG },
]

// สถานะสินค้า (logic เดิมจาก updateInventoryUI)
const isOutOfStock = (p: Product) => p.currentStock <= 0 || p.status === 'Out of Stock' || p.status === 'สินค้าหมด'
const isLowStock = (p: Product) =>
  !isOutOfStock(p) && (p.currentStock <= p.minStock || p.status === 'Low Stock' || p.status === 'เหลือน้อย')

function StatusBadge({ product }: { product: Product }) {
  if (isOutOfStock(product)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> สินค้าหมด
      </span>
    )
  }
  if (isLowStock(product)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> เหลือน้อย
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> พร้อมขาย
    </span>
  )
}

const stockClassOf = (p: Product) => {
  if (isOutOfStock(p)) return 'text-rose-600 font-medium line-through opacity-50'
  if (isLowStock(p)) return 'text-amber-600 font-bold'
  return 'text-on-surface'
}

type EditForm = {
  name: string
  cost: string
  priceCash: string
  priceGrab: string
  priceLineman: string
  stockIn: string
  minStock: string
  image: string
  imagePreview: string
}

const EMPTY_FORM: EditForm = { name: '', cost: '', priceCash: '', priceGrab: '', priceLineman: '', stockIn: '', minStock: '', image: '', imagePreview: '' }

const inputClass = (hasError: boolean) =>
  `w-full h-11 px-3 rounded-xl border bg-surface-container-lowest focus:ring-1 outline-none font-body-md text-on-surface ${
    hasError ? 'border-error ring-error focus:border-error focus:ring-error' : 'border-outline-variant focus:border-secondary focus:ring-secondary'
  }`

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS)
  const [filterText, setFilterText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set()) // เก็บชื่อสินค้า
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [detailModalType, setDetailModalType] = useState<'low' | 'out' | null>(null)
  const [editModal, setEditModal] = useState<{ open: boolean; isEdit: boolean; originalName: string }>({ open: false, isEdit: false, originalName: '' })
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM)
  const [editErrors, setEditErrors] = useState<Set<string>>(new Set())
  const [editErrorMsg, setEditErrorMsg] = useState('')
  const [stockInModal, setStockInModal] = useState<{ open: boolean; productName: string }>({ open: false, productName: '' })
  const [stockInQty, setStockInQty] = useState('')
  const [stockInNote, setStockInNote] = useState('')
  const [stockInError, setStockInError] = useState('')

  // ปิด modal เมื่อกด Escape (เหมือนของเดิม)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditModal((m) => ({ ...m, open: false }))
        setDetailModalType(null)
        setStockInModal((m) => ({ ...m, open: false }))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // กรองตามชื่อสินค้าก่อน slice (logic เดิมจาก renderInventoryTable)
  const filtered = useMemo(() => {
    const query = filterText.toLowerCase().trim()
    return query ? products.filter((p) => p.name != null && String(p.name).toLowerCase().includes(query)) : products
  }, [products, filterText])

  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filtered.slice(startIndex, startIndex + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  const lowItems = useMemo(() => products.filter(isLowStock), [products])
  const outItems = useMemo(() => products.filter(isOutOfStock), [products])

  const resetSelection = () => setSelected(new Set())

  const toggleSelect = (name: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(name)
    else next.delete(name)
    setSelected(next)
  }

  // TODO: เชื่อม Server Action deleteProducts (Google Sheets) แทนการลบใน state
  const executeDelete = () => {
    setProducts(products.filter((p) => !selected.has(p.name)))
    resetSelection()
    setDeleteConfirmOpen(false)
  }

  // ---------- Add / Edit Product Modal ----------
  const openAddModal = () => {
    setEditForm(EMPTY_FORM)
    setEditErrors(new Set())
    setEditErrorMsg('')
    setEditModal({ open: true, isEdit: false, originalName: '' })
  }

  const openEditModalForProduct = (p: Product) => {
    setEditForm({
      name: p.name,
      cost: String(p.cost || 0),
      priceCash: String(p.priceCash || 0),
      priceGrab: String(p.priceGrab || 0),
      priceLineman: String(p.priceLineman || 0),
      stockIn: String(p.stockIn || 0),
      minStock: String(p.minStock || 0),
      image: p.image || '',
      imagePreview: p.image || '',
    })
    setEditErrors(new Set())
    setEditErrorMsg('')
    setEditModal({ open: true, isEdit: true, originalName: p.name })
  }

  const editProductFromDetail = (p: Product) => {
    setDetailModalType(null)
    setTimeout(() => openEditModalForProduct(p), 200)
  }

  const previewSelectedImage = (input: HTMLInputElement) => {
    const file = input.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
        input.value = ''
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = String(e.target?.result || '')
        setEditForm((f) => ({ ...f, imagePreview: result, image: result }))
      }
      reader.readAsDataURL(file)
    } else {
      setEditForm((f) => ({ ...f, imagePreview: f.image }))
    }
  }

  // TODO: เชื่อม Server Action uploadImageToDrive + addProduct/updateProduct แทนการแก้ state
  const saveProductEdit = () => {
    const required: (keyof EditForm)[] = ['name', 'cost', 'priceCash', 'priceGrab', 'priceLineman', 'stockIn', 'minStock']
    const errors = new Set<string>()
    required.forEach((k) => { if (!editForm[k].trim()) errors.add(k) })
    setEditErrors(errors)
    if (errors.size > 0) {
      setEditErrorMsg('กรุณากรอกข้อมูลที่จำเป็น (ไฮไลต์สีแดง) ให้ครบถ้วน')
      return
    }
    setEditErrorMsg('')

    const data = {
      name: editForm.name.trim(),
      cost: parseFloat(editForm.cost) || 0,
      priceCash: parseFloat(editForm.priceCash) || 0,
      priceGrab: parseFloat(editForm.priceGrab) || 0,
      priceLineman: parseFloat(editForm.priceLineman) || 0,
      stockIn: parseInt(editForm.stockIn) || 0,
      minStock: parseInt(editForm.minStock) || 0,
      image: editForm.image || FALLBACK_IMG,
    }

    if (editModal.isEdit) {
      setProducts(products.map((p) => (p.name === editModal.originalName ? { ...p, ...data } : p)))
    } else {
      setProducts([...products, { ...data, currentStock: data.stockIn, status: 'Active' }])
    }
    setEditModal({ ...editModal, open: false })
  }

  // ---------- Stock In Modal ----------
  const openStockInModal = (p: Product) => {
    setStockInQty('')
    setStockInNote('')
    setStockInError('')
    setStockInModal({ open: true, productName: p.name })
  }

  // TODO: เชื่อม Server Action addStockRecord (Google Sheets) แทนการแก้ state
  const saveStockIn = () => {
    const qty = stockInQty.trim()
    if (!qty || isNaN(Number(qty)) || Number(qty) <= 0 || !Number.isInteger(Number(qty))) {
      setStockInError('กรุณากรอกจำนวนรับเข้าให้ถูกต้อง (จำนวนเต็มมากกว่า 0)')
      return
    }
    setStockInError('')
    setProducts(products.map((p) => (p.name === stockInModal.productName ? { ...p, currentStock: p.currentStock + parseInt(qty) } : p)))
    setStockInModal({ ...stockInModal, open: false })
  }

  const deleteBtnActive = selected.size > 0
  const detailList = detailModalType === 'low' ? lowItems : detailModalType === 'out' ? outItems : []

  return (
    <>
      <div className="h-full flex flex-col p-margin-mobile pb-24 md:p-margin-desktop md:pb-28 lg:pb-margin-desktop w-full overflow-y-auto bg-background">
        {/* Page Header + ปุ่มเพิ่มสินค้า */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 md:mb-xl gap-md flex-shrink-0">
          <div className="hidden md:flex items-stretch gap-4">
            <div className="w-[6px] bg-gradient-to-b from-secondary to-secondary/30 rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(118,90,36,0.2)]"></div>
            <div>
              <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-xs">การจัดการคลังสินค้า</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-0.5">ภาพรวมและรายการสินค้าทั้งหมด</p>
            </div>
          </div>

          {/* Mobile Add Button */}
          <div className="flex justify-end md:hidden w-full mb-2">
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 bg-primary text-on-primary px-4 h-11 rounded-xl hover:bg-primary/90 transition-all active:translate-y-px shadow-md w-fit"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="font-body-md font-medium">เพิ่มสินค้าใหม่</span>
            </button>
          </div>

          {/* Desktop/iPad Add Button */}
          <button
            onClick={openAddModal}
            className="hidden md:flex items-center justify-center gap-2 bg-primary text-on-primary px-lg py-sm rounded-lg hover:bg-primary/90 transition-all active:translate-y-px shadow-sm"
          >
            <span className="material-symbols-outlined">add</span>
            <span className="font-body-md font-medium">เพิ่มสินค้าใหม่</span>
          </button>
        </div>

        {/* การ์ดสรุป: สต็อกต่ำ / สินค้าหมด */}
        <div className="flex flex-col md:grid md:grid-cols-2 gap-md p-2 md:p-4 mb-md flex-shrink-0 relative z-10">
          {/* สต็อกต่ำ */}
          <div
            onClick={() => setDetailModalType('low')}
            className="cursor-pointer hover:-translate-y-1 hover:shadow-premium hover:border-amber-500/30 hover:z-10 transition-all duration-200 active:scale-[0.98] flex-1 md:flex-none w-full md:w-auto bg-surface-container-lowest rounded-xl p-4 md:p-5 lg:p-6 shadow-card border border-outline-variant/80 relative overflow-hidden flex flex-row md:flex-col items-center md:items-start justify-between md:justify-between gap-3 group min-h-[80px] md:min-h-[140px]"
          >
            <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-amber-500/5 rounded-bl-full -mr-4 -mt-4 z-0"></div>
            <div className="relative z-10 flex items-center md:justify-between md:items-start md:w-full">
              <div className="w-10 h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0">
                <span className="material-symbols-outlined text-[20px] md:text-[24px] lg:text-[28px]">warning</span>
              </div>
              <span className="hidden md:inline-block bg-amber-100 text-amber-800 font-label-sm px-2 py-1 rounded-full">เตือน</span>
            </div>
            <div className="flex-1 md:flex-initial relative z-10">
              <h3 className="font-body-md md:font-headline-sm text-on-surface font-semibold md:font-bold md:mb-1">สต็อกต่ำ</h3>
              <div className="hidden md:flex text-xs text-amber-600 font-semibold items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                คลิกดูรายละเอียด <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
            </div>
            <div className="relative z-10 flex items-baseline gap-1 md:gap-2 md:mt-auto">
              <span className="font-headline-sm md:font-headline-xl text-amber-600 font-bold">{lowItems.length.toLocaleString('th-TH')}</span>
              <span className="text-xs md:font-body-sm text-on-surface-variant">รายการ</span>
            </div>
          </div>

          {/* สินค้าหมด */}
          <div
            onClick={() => setDetailModalType('out')}
            className="cursor-pointer hover:-translate-y-1 hover:shadow-premium hover:border-rose-500/30 hover:z-10 transition-all duration-200 active:scale-[0.98] flex-1 md:flex-none w-full md:w-auto bg-surface-container-lowest rounded-xl p-4 md:p-5 lg:p-6 shadow-card border border-outline-variant/80 relative overflow-hidden flex flex-row md:flex-col items-center md:items-start justify-between md:justify-between gap-3 group min-h-[80px] md:min-h-[140px]"
          >
            <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-error/5 rounded-bl-full -mr-4 -mt-4 z-0"></div>
            <div className="relative z-10 flex items-center md:justify-between md:items-start md:w-full">
              <div className="w-10 h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-lg bg-error-container/30 flex items-center justify-center text-error flex-shrink-0">
                <span className="material-symbols-outlined text-[20px] md:text-[24px] lg:text-[28px]">remove_shopping_cart</span>
              </div>
            </div>
            <div className="flex-1 md:flex-initial relative z-10">
              <h3 className="font-body-md md:font-headline-sm text-on-surface font-semibold md:font-bold md:mb-1">สินค้าหมด (Out of Stock)</h3>
              <div className="hidden md:flex text-xs text-error font-semibold items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                คลิกดูรายละเอียด <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
            </div>
            <div className="relative z-10 flex items-baseline gap-1 md:gap-2 md:mt-auto">
              <span className="font-headline-sm md:font-headline-xl text-error font-bold">{outItems.length.toLocaleString('th-TH')}</span>
              <span className="text-xs md:font-body-sm text-on-surface-variant">รายการ</span>
            </div>
          </div>
        </div>

        {/* ตารางรายการสินค้า */}
        <div className="flex-initial bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/80 flex flex-col mb-8 lg:mb-0 lg:overflow-hidden lg:min-h-0">
          <div className="p-4 lg:p-lg border-b border-outline-variant/30 flex flex-col sm:flex-row justify-between sm:items-center gap-sm sm:gap-4 bg-surface/30 flex-shrink-0">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <h3 className="font-headline-sm text-primary flex-shrink-0">รายการสินค้าทั้งหมด</h3>
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
            <div className="relative w-full sm:max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">filter_list</span>
              <input
                type="text"
                value={filterText}
                onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1); resetSelection() }}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all shadow-sm"
                placeholder="ค้นหาสินค้า..."
              />
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
                  <th className="w-[400px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase whitespace-nowrap">ชื่อสินค้า</th>
                  <th className="w-[170px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase text-right whitespace-nowrap">จำนวนสต็อก</th>
                  <th className="w-[150px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase text-right whitespace-nowrap">ราคา (เงินสด)</th>
                  <th className="w-[130px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase text-center whitespace-nowrap">สถานะ</th>
                  <th className="w-[100px] py-4 px-6 text-sm font-extrabold tracking-wider text-on-surface uppercase text-center whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="font-body-sm divide-y divide-outline-variant/30">
                {pageItems.length === 0 ? (
                  <tr><td colSpan={6} className="p-lg text-center text-on-surface-variant">ไม่พบข้อมูลสินค้า</td></tr>
                ) : (
                  pageItems.map((product) => (
                    <tr key={product.name} className={`hover:bg-primary/[0.02] transition-colors duration-150 border-b border-outline-variant/10 ${selected.has(product.name) ? 'bg-error/[0.04]' : ''}`}>
                      <td className="py-4 pl-5 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(product.name)}
                          onChange={(e) => toggleSelect(product.name, e.target.checked)}
                          className="w-4 h-4 rounded-[4px] border-outline-variant text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded-lg border border-outline-variant/30 shadow-sm" onError={(e) => { e.currentTarget.src = FALLBACK_IMG }} />
                          <div>
                            <div className="text-on-surface font-semibold text-body-md">{product.name}</div>
                            <div className="text-xs text-on-surface-variant mt-0.5">ต้นทุน: <span className="font-medium">{thbFormat(product.cost)}</span></div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-4 px-6 text-right font-medium text-body-md ${stockClassOf(product)}`}>{formatNum(product.currentStock)} ชิ้น</td>
                      <td className="py-4 px-6 text-right font-bold text-body-md text-on-surface">{thbFormat(product.priceCash)}</td>
                      <td className="py-4 px-6 text-center"><StatusBadge product={product} /></td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button onClick={() => openStockInModal(product)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-500/10 text-emerald-600 transition-all interactive-press" title="รับเข้าสต็อก">
                            <span className="material-symbols-outlined text-[20px]">add_box</span>
                          </button>
                          <button onClick={() => openEditModalForProduct(product)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary-container/20 text-on-surface-variant hover:text-secondary transition-all interactive-press role-admin-only" title="แก้ไขข้อมูล">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden flex flex-col gap-sm p-sm bg-background">
            {pageItems.length === 0 ? (
              <div className="p-lg text-center text-on-surface-variant">ไม่พบข้อมูลสินค้า</div>
            ) : (
              pageItems.map((product) => (
                <div key={product.name} className={`bg-surface-container-lowest rounded-xl p-4 shadow-sm border relative flex flex-col gap-2 transition-all duration-200 ${selected.has(product.name) ? 'bg-error/[0.04] border-error/30' : 'border-outline-variant/80'}`}>
                  <div className="flex items-center justify-between">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-outline-variant/30 shadow-sm flex-shrink-0" onError={(e) => { e.currentTarget.src = FALLBACK_IMG }} />
                    <div className="flex-shrink-0"><StatusBadge product={product} /></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={selected.has(product.name)}
                        onChange={(e) => toggleSelect(product.name, e.target.checked)}
                        className="w-4 h-4 rounded-[4px] border-outline-variant text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-on-surface text-body-md break-words">{product.name}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">ต้นทุน: <span className="font-medium">{thbFormat(product.cost)}</span></div>
                    </div>
                  </div>
                  <hr className="border-t border-outline-variant/10 my-1" />
                  <div className="flex justify-between items-center w-full pl-6">
                    <div className="flex flex-col gap-0.5 text-xs text-on-surface-variant">
                      <div>ราคา: <span className="text-on-surface font-bold text-body-md">{thbFormat(product.priceCash)}</span></div>
                      <div className={stockClassOf(product)}>สต็อก: <span className="font-bold text-body-md text-on-surface">{formatNum(product.currentStock)} ชิ้น</span></div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openStockInModal(product)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-500/10 text-emerald-600 transition-all" title="รับเข้าสต็อก">
                        <span className="material-symbols-outlined text-[20px]">add_box</span>
                      </button>
                      <button onClick={() => openEditModalForProduct(product)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary-container/20 text-on-surface-variant hover:text-secondary transition-all role-admin-only">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-outline-variant/20 flex-shrink-0">
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
              <h3 className="font-headline-sm text-on-surface">ยืนยันการลบสินค้า</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
          </div>
          <div className="px-6 pb-4">
            <p className="text-sm text-on-surface-variant mb-3">
              ต้องการลบสินค้า <span className="font-bold text-error">{selected.size} รายการ</span> ออกจากระบบ?
            </p>
            <ul className="space-y-2 max-h-48 overflow-y-auto bg-error-container/10 border border-error/15 rounded-xl p-3">
              {Array.from(selected).map((n) => (
                <li key={n} className="flex items-center gap-2 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-error flex-shrink-0">inventory_2</span>{n}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20">
            <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 h-11 rounded-xl border border-outline-variant text-on-surface-variant font-body-md font-medium hover:bg-surface-container transition-colors">
              ยกเลิก
            </button>
            <button onClick={executeDelete} className="flex-1 h-11 rounded-xl bg-error text-on-error font-body-md font-medium hover:bg-error/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">delete</span>
              ยืนยันการลบ
            </button>
          </div>
        </div>
      </div>

      {/* ==================== Detail List Modal (สต็อกต่ำ / สินค้าหมด) ==================== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${detailModalType ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setDetailModalType(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className={`relative z-10 w-full max-w-4xl bg-surface rounded-2xl shadow-premium overflow-hidden flex flex-col max-h-[85dvh] transition-transform duration-200 ${detailModalType ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${detailModalType === 'low' ? 'bg-amber-500/10 text-amber-600' : 'bg-error-container/30 text-error'}`}>
                <span className="material-symbols-outlined text-[20px]">{detailModalType === 'low' ? 'warning' : 'remove_shopping_cart'}</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-primary">
                  {detailModalType === 'low' ? 'สินค้าสต็อกต่ำ (Low Stock)' : 'สินค้าหมด (Out of Stock)'}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {detailModalType === 'low'
                    ? `พบสินค้าเหลือน้อยกว่าเกณฑ์ขั้นต่ำทั้งหมด ${detailList.length} รายการ`
                    : `พบสินค้าหมดทั้งหมด ${detailList.length} รายการ`}
                </p>
              </div>
            </div>
            <button onClick={() => setDetailModalType(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30">
                    <th className="pb-3 text-xs font-bold text-on-surface-variant uppercase">สินค้า</th>
                    <th className="pb-3 text-xs font-bold text-on-surface-variant uppercase text-right">สต็อกปัจจุบัน</th>
                    {detailModalType === 'low' && (
                      <th className="pb-3 text-xs font-bold text-on-surface-variant uppercase text-right">สต็อกขั้นต่ำ</th>
                    )}
                    <th className="pb-3 text-xs font-bold text-on-surface-variant uppercase text-center w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 font-body-sm">
                  {detailList.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-on-surface-variant font-medium">ไม่มีรายการสินค้าที่สอดคล้องกับสถานะนี้</td></tr>
                  ) : (
                    detailList.map((product) => (
                      <tr key={product.name} className="hover:bg-primary/[0.01] transition-colors border-b border-outline-variant/10">
                        <td className="py-3.5 pr-2">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-outline-variant/30 shadow-sm" onError={(e) => { e.currentTarget.src = FALLBACK_IMG }} />
                            <div>
                              <div className="text-on-surface font-semibold text-body-md">{product.name}</div>
                              <div className="text-xs text-on-surface-variant mt-0.5">ราคา: <span className="font-medium text-secondary">{thbFormat(product.priceCash)}</span></div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-3.5 px-2 text-right font-semibold text-body-md ${product.currentStock <= 0 ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}`}>
                          {formatNum(product.currentStock)} ชิ้น
                        </td>
                        {detailModalType === 'low' && (
                          <td className="py-3.5 px-2 text-right font-medium text-amber-600">{formatNum(product.minStock)} ชิ้น</td>
                        )}
                        <td className="py-3.5 pl-2 text-center">
                          <button onClick={() => editProductFromDetail(product)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-secondary-container/20 text-on-surface-variant hover:text-secondary transition-all interactive-press">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end px-6 py-4 border-t border-outline-variant/30 bg-surface-container-low flex-shrink-0">
            <button onClick={() => setDetailModalType(null)} className="px-5 h-11 rounded-xl bg-secondary text-on-secondary font-body-md font-medium hover:bg-secondary/90 transition-all active:scale-[0.98] shadow-sm">
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* ==================== Add / Edit Product Modal ==================== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${editModal.open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setEditModal({ ...editModal, open: false })} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className={`relative z-10 w-full max-w-lg bg-surface rounded-2xl shadow-premium overflow-hidden flex flex-col max-h-[90dvh] transition-transform duration-200 ${editModal.open ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary-container/30 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">{editModal.isEdit ? 'edit' : 'add'}</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-on-surface">{editModal.isEdit ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{editModal.isEdit ? editModal.originalName : 'กรอกข้อมูลรายละเอียดสินค้า'}</p>
              </div>
            </div>
            <button onClick={() => setEditModal({ ...editModal, open: false })} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {/* Product image preview */}
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editForm.imagePreview || FALLBACK_IMG}
                alt="preview"
                className="w-16 h-16 rounded-xl object-cover border border-outline-variant/40 shadow-sm bg-surface-container"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMG }}
              />
              <div className="flex-1">
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">รูปภาพสินค้า</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => previewSelectedImage(e.currentTarget)}
                  className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-secondary-container/50 file:text-secondary hover:file:bg-secondary-container transition-colors rounded-xl outline-none"
                />
              </div>
            </div>

            {/* ชื่อสินค้า */}
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ชื่อสินค้า</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className={inputClass(editErrors.has('name'))}
                placeholder="ชื่อสินค้า"
              />
            </div>

            {/* ราคา grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ต้นทุน (฿)</label>
                <input type="number" min={0} step={0.01} value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} className={inputClass(editErrors.has('cost'))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ราคาหน้าร้าน (฿)</label>
                <input type="number" min={0} step={0.01} value={editForm.priceCash} onChange={(e) => setEditForm({ ...editForm, priceCash: e.target.value })} className={inputClass(editErrors.has('priceCash'))} />
              </div>
              <div>
                <label className="text-xs font-medium text-on-surface-variant mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> ราคา Grab (฿)
                </label>
                <input type="number" min={0} step={0.01} value={editForm.priceGrab} onChange={(e) => setEditForm({ ...editForm, priceGrab: e.target.value })} className={inputClass(editErrors.has('priceGrab'))} />
              </div>
              <div>
                <label className="text-xs font-medium text-on-surface-variant mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span> ราคา LINE MAN (฿)
                </label>
                <input type="number" min={0} step={0.01} value={editForm.priceLineman} onChange={(e) => setEditForm({ ...editForm, priceLineman: e.target.value })} className={inputClass(editErrors.has('priceLineman'))} />
              </div>
            </div>

            {/* Stock In / Min Stock grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">รับเข้าจำนวน (ชิ้น)</label>
                <input type="number" min={0} step={1} value={editForm.stockIn} onChange={(e) => setEditForm({ ...editForm, stockIn: e.target.value })} className={inputClass(editErrors.has('stockIn'))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">สต็อกต่ำ (ชิ้น)</label>
                <input type="number" min={0} step={1} value={editForm.minStock} onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })} className={inputClass(editErrors.has('minStock'))} />
              </div>
            </div>

            {/* Error message */}
            {editErrorMsg && (
              <div className="text-sm text-error bg-error-container/20 border border-error/20 rounded-xl px-4 py-3">{editErrorMsg}</div>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/30 bg-surface flex-shrink-0">
            <button onClick={() => setEditModal({ ...editModal, open: false })} className="flex-1 h-11 rounded-xl border border-outline-variant text-on-surface-variant font-body-md font-medium hover:bg-surface-container-low transition-colors">
              ยกเลิก
            </button>
            <button onClick={saveProductEdit} className="flex-1 h-11 rounded-xl bg-secondary text-on-secondary font-body-md font-medium hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">save</span>
              บันทึก
            </button>
          </div>
        </div>
      </div>

      {/* ==================== Stock In Modal ==================== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${stockInModal.open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setStockInModal({ ...stockInModal, open: false })} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className={`relative z-10 w-full max-w-md bg-surface rounded-2xl shadow-premium overflow-hidden flex flex-col transition-transform duration-200 ${stockInModal.open ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[20px]">add_box</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-on-surface">รับเข้าสต็อกสินค้า</h3>
                <p className="text-xs text-on-surface-variant mt-0.5 font-semibold">{stockInModal.productName}</p>
              </div>
            </div>
            <button onClick={() => setStockInModal({ ...stockInModal, open: false })} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">จำนวนรับเข้า (ชิ้น) <span className="text-error">*</span></label>
              <input
                type="number"
                min={1}
                step={1}
                value={stockInQty}
                onChange={(e) => setStockInQty(e.target.value)}
                className={inputClass(!!stockInError)}
                placeholder="ระบุจำนวนตัวเลขมากกว่า 0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">หมายเหตุ</label>
              <textarea
                rows={3}
                value={stockInNote}
                onChange={(e) => setStockInNote(e.target.value)}
                className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-md text-on-surface resize-none"
                placeholder="ระบุหมายเหตุ (ถ้ามี)"
              ></textarea>
            </div>
            {stockInError && (
              <div className="text-sm text-error bg-error-container/20 border border-error/20 rounded-xl px-4 py-3">{stockInError}</div>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/30 bg-surface flex-shrink-0">
            <button onClick={() => setStockInModal({ ...stockInModal, open: false })} className="flex-1 h-11 rounded-xl border border-outline-variant text-on-surface-variant font-body-md font-medium hover:bg-surface-container-low transition-colors">
              ยกเลิก
            </button>
            <button onClick={saveStockIn} className="flex-1 h-11 rounded-xl bg-secondary text-on-secondary font-body-md font-medium hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">save</span>
              บันทึกการรับเข้า
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

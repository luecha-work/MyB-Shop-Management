'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Modal, Pagination, Table, Tag, Upload } from 'antd'
import type { TableColumnsType } from 'antd'
import {
  ArrowRightOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  PlusOutlined,
  PlusSquareOutlined,
  SaveOutlined,
  StopOutlined,
  UploadOutlined,
  WarningOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { thbFormat, formatNum } from '@/lib/format'
import { Loader } from '@/components/UI/Loader'

// ==========================================
// Types
// ==========================================
type Product = {
  id?: string
  productCode?: string
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
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const productImageSrc = (image: string) => image.trim() || FALLBACK_IMG

// สถานะสินค้า (logic เดิมจาก updateInventoryUI)
const isOutOfStock = (p: Product) => p.currentStock <= 0 || p.status === 'Out of Stock' || p.status === 'สินค้าหมด'
const isLowStock = (p: Product) =>
  !isOutOfStock(p) && (p.currentStock <= p.minStock || p.status === 'Low Stock' || p.status === 'เหลือน้อย')

function StatusBadge({ product }: { product: Product }) {
  if (isOutOfStock(product)) {
    return <Tag className="rounded-full border-rose-300 bg-rose-50 !text-rose-700 font-bold">สินค้าหมด</Tag>
  }
  if (isLowStock(product)) {
    return <Tag className="rounded-full border-amber-300 bg-amber-50 !text-amber-700 font-bold">เหลือน้อย</Tag>
  }
  return <Tag className="rounded-full border-emerald-300 bg-emerald-50 !text-emerald-700 font-bold">พร้อมขาย</Tag>
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

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 30]

// InputNumber แบบ string state (ฟอร์มเดิมเก็บเป็น string)
function NumberField({
  value, onChange, hasError, min = 0, step = 0.01, placeholder,
}: {
  value: string; onChange: (v: string) => void; hasError: boolean; min?: number; step?: number; placeholder?: string
}) {
  return (
    <InputNumber
      min={min}
      step={step}
      value={value === '' ? null : Number(value)}
      onChange={(v) => onChange(v == null ? '' : String(v))}
      status={hasError ? 'error' : undefined}
      placeholder={placeholder}
      className="w-full"
      style={{ width: '100%' }}
      size="large"
    />
  )
}

export default function InventoryPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [loadError, setLoadError] = useState('')

  const loadProducts = useCallback(async () => {
    const res = await fetch('/api/products', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to load products')
    const data = await res.json() as { products: Product[] }
    return data.products
  }, [])

  useEffect(() => {
    let active = true
    loadProducts()
      .then((nextProducts) => {
        if (!active) return
        setProducts(nextProducts)
      })
      .catch((error) => {
        console.error(error)
        if (active) setLoadError('โหลดข้อมูลสินค้าจากฐานข้อมูลไม่สำเร็จ')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [loadProducts])

  const [filterText, setFilterText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('')
  const [detailModalType, setDetailModalType] = useState<'low' | 'out' | null>(null)
  const [editModal, setEditModal] = useState<{ open: boolean; isEdit: boolean; originalName: string; originalId: string }>({ open: false, isEdit: false, originalName: '', originalId: '' })
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [isProductSaving, setIsProductSaving] = useState(false)
  const [editErrors, setEditErrors] = useState<Set<string>>(new Set())
  const [editErrorMsg, setEditErrorMsg] = useState('')
  const [stockInModal, setStockInModal] = useState<{ open: boolean; productId: string; productName: string }>({ open: false, productId: '', productName: '' })
  const [stockInQty, setStockInQty] = useState('')
  const [stockInNote, setStockInNote] = useState('')
  const [stockInError, setStockInError] = useState('')
  const [isStockInSaving, setIsStockInSaving] = useState(false)

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
  const selectedProducts = useMemo(() => products.filter((p) => p.id && selected.has(p.id)), [products, selected])

  const resetSelection = () => setSelected(new Set())

  const applyFilter = (fn: () => void) => {
    fn()
    setCurrentPage(1)
    resetSelection()
  }

  const toggleSelect = (id: string | undefined, checked: boolean) => {
    if (!id) return
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    setSelected(next)
  }

  const executeDelete = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return

    setIsDeleting(true)
    setDeleteErrorMsg('')

    try {
      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'ลบสินค้าไม่สำเร็จ')

      setProducts(await loadProducts())
      resetSelection()
      setDeleteConfirmOpen(false)
    } catch (error) {
      setDeleteErrorMsg(error instanceof Error ? error.message : 'ลบสินค้าไม่สำเร็จ')
    } finally {
      setIsDeleting(false)
    }
  }

  // ---------- Add / Edit Product Modal ----------
  const openAddModal = () => {
    setEditForm(EMPTY_FORM)
    setEditImageFile(null)
    setEditErrors(new Set())
    setEditErrorMsg('')
    setEditModal({ open: true, isEdit: false, originalName: '', originalId: '' })
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
    setEditImageFile(null)
    setEditErrors(new Set())
    setEditErrorMsg('')
    setEditModal({ open: true, isEdit: true, originalName: p.name, originalId: p.id ?? '' })
  }

  const editProductFromDetail = (p: Product) => {
    setDetailModalType(null)
    setTimeout(() => openEditModalForProduct(p), 200)
  }

  // preview รูปที่เลือกจาก antd Upload (FileReader เดิม)
  const previewSelectedImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setEditErrorMsg('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setEditErrorMsg('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = String(e.target?.result || '')
      setEditImageFile(file)
      setEditForm((f) => ({ ...f, imagePreview: result }))
      setEditErrorMsg('')
    }
    reader.readAsDataURL(file)
  }

  const uploadProductImage = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('productName', editForm.name.trim())

    const response = await fetch('/api/products/images', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()

    if (!response.ok) throw new Error(data.error || 'อัปโหลดรูปภาพไม่สำเร็จ')
    return String(data.publicUrl || '')
  }

  const saveProductEdit = async () => {
    const required: (keyof EditForm)[] = ['name', 'cost', 'priceCash', 'priceGrab', 'priceLineman', 'stockIn', 'minStock']
    const errors = new Set<string>()
    required.forEach((k) => { if (!editForm[k].trim()) errors.add(k) })
    setEditErrors(errors)
    if (errors.size > 0) {
      setEditErrorMsg('กรุณากรอกข้อมูลที่จำเป็น (ไฮไลต์สีแดง) ให้ครบถ้วน')
      return
    }
    setEditErrorMsg('')
    setIsProductSaving(true)

    try {
      const imageUrl = editImageFile ? await uploadProductImage(editImageFile) : editForm.image

      const data = {
        name: editForm.name.trim(),
        cost: parseFloat(editForm.cost) || 0,
        priceCash: parseFloat(editForm.priceCash) || 0,
        priceGrab: parseFloat(editForm.priceGrab) || 0,
        priceLineman: parseFloat(editForm.priceLineman) || 0,
        stockIn: parseInt(editForm.stockIn) || 0,
        minStock: parseInt(editForm.minStock) || 0,
        imageUrl,
      }

      const response = await fetch('/api/products', {
        method: editModal.isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editModal.isEdit
            ? { action: 'update-product', id: editModal.originalId, ...data }
            : data,
        ),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'บันทึกสินค้าไม่สำเร็จ')

      if (editModal.isEdit) {
        setProducts(products.map((p) => (p.id === editModal.originalId ? result.product : p)))
      } else {
        setProducts([...products, result.product])
      }
      setProducts(await loadProducts())
      setEditImageFile(null)
      setEditModal({ ...editModal, open: false })
    } catch (error) {
      setEditErrorMsg(error instanceof Error ? error.message : 'อัปโหลดรูปภาพหรือบันทึกสินค้าไม่สำเร็จ')
    } finally {
      setIsProductSaving(false)
    }
  }

  // ---------- Stock In Modal ----------
  const openStockInModal = (p: Product) => {
    setStockInQty('')
    setStockInNote('')
    setStockInError('')
    setStockInModal({ open: true, productId: p.id ?? '', productName: p.name })
  }

  const saveStockIn = async () => {
    const qty = stockInQty.trim()
    if (!qty || isNaN(Number(qty)) || Number(qty) <= 0 || !Number.isInteger(Number(qty))) {
      setStockInError('กรุณากรอกจำนวนรับเข้าให้ถูกต้อง (จำนวนเต็มมากกว่า 0)')
      return
    }
    if (!stockInModal.productId) {
      setStockInError('ไม่พบรหัสสินค้าที่ต้องการรับเข้า')
      return
    }

    setStockInError('')
    setIsStockInSaving(true)
    try {
      const response = await fetch('/api/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: stockInModal.productId,
          quantity: parseInt(qty),
          note: stockInNote.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'บันทึกรับเข้าไม่สำเร็จ')

      setProducts(await loadProducts())
      setStockInModal({ ...stockInModal, open: false })
    } catch (error) {
      setStockInError(error instanceof Error ? error.message : 'บันทึกรับเข้าไม่สำเร็จ')
    } finally {
      setIsStockInSaving(false)
    }
  }

  const deleteBtnActive = selected.size > 0
  // แสดง loading ระหว่างรอโหลดข้อมูล
  if (isLoading) return <Loader text="โหลดข้อมูลคลังสินค้า..." />

  const detailList = detailModalType === 'low' ? lowItems : detailModalType === 'out' ? outItems : []

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
  const columns: TableColumnsType<Product> = [
    {
      title: 'ชื่อสินค้า',
      dataIndex: 'name',
      key: 'name',
      width: 400,
      render: (_, product) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImageSrc(product.image)} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-outline-variant/30 shadow-sm" onError={(e) => { e.currentTarget.src = FALLBACK_IMG }} />
          <div>
            <div className="font-semibold text-primary text-body-md">{product.name}</div>
            <div className="text-xs text-on-surface-variant mt-0.5">ต้นทุน: <span className="font-medium">{thbFormat(product.cost)}</span></div>
          </div>
        </div>
      ),
    },
    {
      title: 'จำนวนสต็อก',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 170,
      align: 'right',
      render: (_, product) => <span className={`font-bold text-body-md ${stockClassOf(product)}`}>{formatNum(product.currentStock)} ชิ้น</span>,
    },
    {
      title: 'ราคา (เงินสด)',
      dataIndex: 'priceCash',
      key: 'priceCash',
      width: 150,
      align: 'right',
      render: (val: number) => <span className="font-bold text-body-md text-secondary">{thbFormat(val)}</span>,
    },
    {
      title: 'สถานะ',
      key: 'status',
      width: 130,
      align: 'center',
      render: (_, product) => <StatusBadge product={product} />,
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, product) => (
        <div className="flex justify-center items-center gap-1">
          <Button
            type="text"
            icon={<PlusSquareOutlined className="text-[18px]" />}
            onClick={() => openStockInModal(product)}
            className="text-emerald-600 hover:!bg-emerald-500/10"
            title="รับเข้าสต็อก"
          />
          <Button
            type="text"
            icon={<EditOutlined className="text-[18px]" />}
            onClick={() => openEditModalForProduct(product)}
            className="text-on-surface-variant hover:!text-secondary role-admin-only"
            title="แก้ไขข้อมูล"
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="h-full flex flex-col p-margin-mobile pb-24 md:p-margin-desktop md:pb-28 lg:pb-margin-desktop w-full overflow-y-auto bg-background">
        {loadError && <Alert title={loadError} type="error" showIcon className="mb-md" />}

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
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openAddModal} className="shadow-md">
              เพิ่มสินค้าใหม่
            </Button>
          </div>

          {/* Desktop/iPad Add Button */}
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openAddModal} className="hidden md:inline-flex shadow-sm">
            เพิ่มสินค้าใหม่
          </Button>
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
              <div className="w-10 h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0 text-[20px] md:text-[24px] lg:text-[28px]">
                <WarningOutlined />
              </div>
              <span className="hidden md:inline-block bg-amber-100 text-amber-800 font-label-sm px-2 py-1 rounded-full">เตือน</span>
            </div>
            <div className="flex-1 md:flex-initial relative z-10">
              <h3 className="font-body-md md:font-headline-sm text-on-surface font-semibold md:font-bold md:mb-1">สต็อกต่ำ</h3>
              <div className="hidden md:flex text-xs text-amber-600 font-semibold items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                คลิกดูรายละเอียด <ArrowRightOutlined className="text-[12px]" />
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
              <div className="w-10 h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 rounded-lg bg-error-container/30 flex items-center justify-center text-error flex-shrink-0 text-[20px] md:text-[24px] lg:text-[28px]">
                <StopOutlined />
              </div>
            </div>
            <div className="flex-1 md:flex-initial relative z-10">
              <h3 className="font-body-md md:font-headline-sm text-on-surface font-semibold md:font-bold md:mb-1">สินค้าหมด (Out of Stock)</h3>
              <div className="hidden md:flex text-xs text-error font-semibold items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                คลิกดูรายละเอียด <ArrowRightOutlined className="text-[12px]" />
              </div>
            </div>
            <div className="relative z-10 flex items-baseline gap-1 md:gap-2 md:mt-auto">
              <span className="font-headline-sm md:font-headline-xl text-error font-bold">{outItems.length.toLocaleString('th-TH')}</span>
              <span className="text-xs md:font-body-sm text-on-surface-variant">รายการ</span>
            </div>
          </div>
        </div>

        <div className="flex-initial bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/80 flex flex-col mb-8 lg:mb-0 lg:min-h-0">
          {/* Toolbar: ค้นหา + ปุ่มลบ */}
          <div className="p-4 lg:p-lg border-b border-outline-variant/30 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-surface/30 flex-shrink-0">
            <div className="flex items-center justify-between gap-3 w-full xl:w-auto">
              <h3 className="font-headline-sm text-primary flex-shrink-0">รายการสินค้าทั้งหมด</h3>
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
                placeholder="ค้นหาสินค้า..."
                allowClear
                className="w-full lg:w-64 shadow-sm font-body-sm"
              />
            </div>
          </div>

          {/* Desktop Table (antd) */}
          <div className="hidden lg:block">
            <Table<Product>
              rowKey="id"
              columns={columns}
              dataSource={pageItems}
              pagination={paginationConfig}
              scroll={{ x: 1180 }}
              rowSelection={{
                selectedRowKeys: Array.from(selected),
                onChange: (keys) => setSelected(new Set(keys as string[])),
                columnWidth: 50,
              }}
              rowClassName={(record) => (record.id && selected.has(record.id) ? 'bg-error/[0.04]' : '')}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่พบข้อมูลสินค้า" /> }}
            />
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden flex flex-col gap-sm p-sm bg-background">
            {pageItems.length === 0 ? (
              <div className="p-lg text-center text-on-surface-variant">ไม่พบข้อมูลสินค้า</div>
            ) : (
              pageItems.map((product) => (
                <article key={product.id ?? product.name} className={`bg-surface-container-lowest hover:border-secondary/50 rounded-xl p-md shadow-sm border border-outline-variant/80 relative flex flex-col gap-2 transition-all duration-200 ${product.id && selected.has(product.id) ? 'bg-error/[0.04]' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary truncate pr-2">{product.name}</span>
                    <div className="flex-shrink-0"><StatusBadge product={product} /></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <Checkbox
                        checked={Boolean(product.id && selected.has(product.id))}
                        disabled={!product.id}
                        onChange={(e) => toggleSelect(product.id, e.target.checked)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={productImageSrc(product.image)} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-outline-variant/30 shadow-sm flex-shrink-0" onError={(e) => { e.currentTarget.src = FALLBACK_IMG }} />
                        <div>
                          <div className="font-medium text-on-surface text-body-md break-words">{product.name}</div>
                          <div className="text-xs text-on-surface-variant mt-0.5">ต้นทุน: <span className="font-medium">{thbFormat(product.cost)}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <hr className="border-t border-outline-variant/10 my-1" />
                  <div className="flex justify-between items-center w-full pl-6">
                    <div className="flex flex-col gap-0.5 text-xs text-on-surface-variant">
                      <div>ราคา: <span className="text-on-surface font-bold text-body-md">{thbFormat(product.priceCash)}</span></div>
                      <div className={stockClassOf(product)}>สต็อก: <span className="font-bold text-body-md text-on-surface">{formatNum(product.currentStock)} ชิ้น</span></div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button type="text" icon={<PlusSquareOutlined className="text-[18px]" />} onClick={() => openStockInModal(product)} className="text-emerald-600" title="รับเข้าสต็อก" />
                      <Button type="text" icon={<EditOutlined className="text-[18px]" />} onClick={() => openEditModalForProduct(product)} className="text-on-surface-variant role-admin-only" />
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
              <div className="font-headline-sm text-on-surface">ยืนยันการลบสินค้า</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">การดำเนินการนี้ไม่สามารถย้อนกลับได้</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => setDeleteConfirmOpen(false)} className="h-11 ant-btn-cancel-soft">ยกเลิก</Button>
            <Button type="primary" danger block icon={<DeleteOutlined />} onClick={executeDelete} loading={isDeleting} className="h-11">
              ยืนยันการลบ
            </Button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant mb-3">
          ต้องการลบสินค้า <span className="font-bold text-error">{selected.size} รายการ</span> ออกจากระบบ?
        </p>
        {deleteErrorMsg && <Alert title={deleteErrorMsg} type="error" showIcon className="mb-3 rounded-xl" />}
        <ul className="space-y-2 max-h-48 overflow-y-auto bg-error-container/10 border border-error/15 rounded-xl p-3">
          {selectedProducts.map((product) => (
            <li key={product.id} className="flex items-center gap-2 text-sm text-on-surface">
              <AppstoreOutlined className="text-[14px] text-error flex-shrink-0" />{product.name}
            </li>
          ))}
        </ul>
      </Modal>

      {/* ==================== Detail List Modal (สต็อกต่ำ / สินค้าหมด) ==================== */}
      <Modal
        open={!!detailModalType}
        onCancel={() => setDetailModalType(null)}
        centered
        width={896}
        title={
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${detailModalType === 'low' ? 'bg-amber-500/10 text-amber-600' : 'bg-error-container/30 text-error'}`}>
              {detailModalType === 'low' ? <WarningOutlined className="text-[18px]" /> : <StopOutlined className="text-[18px]" />}
            </div>
            <div>
              <div className="font-headline-sm text-primary">
                {detailModalType === 'low' ? 'สินค้าสต็อกต่ำ (Low Stock)' : 'สินค้าหมด (Out of Stock)'}
              </div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">
                {detailModalType === 'low'
                  ? `พบสินค้าเหลือน้อยกว่าเกณฑ์ขั้นต่ำทั้งหมด ${detailList.length} รายการ`
                  : `พบสินค้าหมดทั้งหมด ${detailList.length} รายการ`}
              </div>
            </div>
          </div>
        }
        footer={
          <Button onClick={() => setDetailModalType(null)} className="ant-btn-secondary-solid h-11 px-5">
            ปิดหน้าต่าง
          </Button>
        }
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
      >
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
                        <img src={productImageSrc(product.image)} alt={product.name} className="w-10 h-10 object-cover rounded-lg border border-outline-variant/30 shadow-sm" onError={(e) => { e.currentTarget.src = FALLBACK_IMG }} />
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
                      <Button type="text" icon={<EditOutlined className="text-[16px]" />} onClick={() => editProductFromDetail(product)} className="text-on-surface-variant hover:!text-secondary" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* ==================== Add / Edit Product Modal ==================== */}
      <Modal
        open={editModal.open}
        onCancel={() => setEditModal({ ...editModal, open: false })}
        centered
        width={512}
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary-container/30 flex items-center justify-center text-secondary">
              {editModal.isEdit ? <EditOutlined className="text-[18px]" /> : <PlusOutlined className="text-[18px]" />}
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">{editModal.isEdit ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">{editModal.isEdit ? editModal.originalName : 'กรอกข้อมูลรายละเอียดสินค้า'}</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => setEditModal({ ...editModal, open: false })} className="h-11 ant-btn-cancel-soft">ยกเลิก</Button>
            <Button block icon={<SaveOutlined />} loading={isProductSaving} onClick={saveProductEdit} className="ant-btn-secondary-solid h-11">
              บันทึก
            </Button>
          </div>
        }
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        <div className="space-y-5 py-1">
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
              <Upload
                accept="image/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={(file) => { previewSelectedImage(file); return false }}
              >
                <Button icon={<UploadOutlined />}>เลือกรูปภาพ</Button>
              </Upload>
            </div>
          </div>

          {/* ชื่อสินค้า */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ชื่อสินค้า</label>
            <Input
              size="large"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              status={editErrors.has('name') ? 'error' : undefined}
              placeholder="ชื่อสินค้า"
            />
          </div>

          {/* ราคา grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ต้นทุน (฿)</label>
              <NumberField value={editForm.cost} onChange={(v) => setEditForm({ ...editForm, cost: v })} hasError={editErrors.has('cost')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">ราคาหน้าร้าน (฿)</label>
              <NumberField value={editForm.priceCash} onChange={(v) => setEditForm({ ...editForm, priceCash: v })} hasError={editErrors.has('priceCash')} />
            </div>
            <div>
              <label className="text-xs font-medium text-on-surface-variant mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> ราคา Grab (฿)
              </label>
              <NumberField value={editForm.priceGrab} onChange={(v) => setEditForm({ ...editForm, priceGrab: v })} hasError={editErrors.has('priceGrab')} />
            </div>
            <div>
              <label className="text-xs font-medium text-on-surface-variant mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span> ราคา LINE MAN (฿)
              </label>
              <NumberField value={editForm.priceLineman} onChange={(v) => setEditForm({ ...editForm, priceLineman: v })} hasError={editErrors.has('priceLineman')} />
            </div>
          </div>

          {/* Stock In / Min Stock grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">รับเข้าจำนวน (ชิ้น)</label>
              <NumberField value={editForm.stockIn} onChange={(v) => setEditForm({ ...editForm, stockIn: v })} hasError={editErrors.has('stockIn')} step={1} />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">สต็อกต่ำ (ชิ้น)</label>
              <NumberField value={editForm.minStock} onChange={(v) => setEditForm({ ...editForm, minStock: v })} hasError={editErrors.has('minStock')} step={1} />
            </div>
          </div>

          {/* Error message */}
          {editErrorMsg && <Alert title={editErrorMsg} type="error" showIcon className="rounded-xl" />}
        </div>
      </Modal>

      {/* ==================== Stock In Modal ==================== */}
      <Modal
        open={stockInModal.open}
        onCancel={() => setStockInModal({ ...stockInModal, open: false })}
        centered
        width={448}
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <PlusSquareOutlined className="text-[18px]" />
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">รับเข้าสต็อกสินค้า</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-semibold">{stockInModal.productName}</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => setStockInModal({ ...stockInModal, open: false })} className="h-11 ant-btn-cancel-soft">ยกเลิก</Button>
            <Button block icon={<SaveOutlined />} loading={isStockInSaving} onClick={saveStockIn} className="ant-btn-secondary-solid h-11">
              บันทึกการรับเข้า
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">จำนวนรับเข้า (ชิ้น) <span className="text-error">*</span></label>
            <InputNumber
              min={1}
              step={1}
              size="large"
              value={stockInQty === '' ? null : Number(stockInQty)}
              onChange={(v) => setStockInQty(v == null ? '' : String(v))}
              status={stockInError ? 'error' : undefined}
              placeholder="ระบุจำนวนตัวเลขมากกว่า 0"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">หมายเหตุ</label>
            <Input.TextArea
              rows={3}
              value={stockInNote}
              onChange={(e) => setStockInNote(e.target.value)}
              placeholder="ระบุหมายเหตุ (ถ้ามี)"
              style={{ resize: 'none' }}
            />
          </div>
          {stockInError && <Alert title={stockInError} type="error" showIcon className="rounded-xl" />}
        </div>
      </Modal>
    </>
  )
}

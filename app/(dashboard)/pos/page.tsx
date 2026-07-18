'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Drawer, Input, Modal, Pagination, Segmented } from 'antd'
import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  FormOutlined,
  MinusOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  TransactionOutlined,
} from '@ant-design/icons'
import { thbFormat } from '@/lib/format'
import { gpRateForChannel, computeSaleLine, GP_RATE_PERCENT } from '@/lib/constants'
import { Loader } from '@/components/UI/Loader'

// ==========================================
// Types
// ==========================================
type Product = {
  id?: string
  name: string
  cost: number
  priceCash: number
  priceGrab: number
  priceLineman: number
  currentStock: number
  status: string
  image: string
}

type CartItem = {
  productId: string
  name: string
  cost: number
  priceCash: number
  priceGrab: number
  priceLineman: number
  qty: number
}

const FALLBACK_IMG = 'https://placehold.co/400x400/eceef0/7c839b?text=No+Image'
const productImageSrc = (image: string) => image.trim() || FALLBACK_IMG

// ==========================================
// จัดกลุ่มตัวอักษรสำหรับหน้าขาย POS (logic เดิมจาก script.html)
// ==========================================
const ALL_GROUPS = ['ก-จ', 'ฉ-ณ', 'ด-บ', 'ป-ม', 'ย-ว', 'ศ-ฮ', '0-9', 'A-Z']
const GROUP_ORDER = [...ALL_GROUPS, 'อื่นๆ']

function getCharacterGroup(productName: string): string {
  if (!productName) return 'อื่นๆ'
  const name = productName.trim()
  if (name.length === 0) return 'อื่นๆ'

  let firstChar = name.charAt(0)
  const leadingVowels = ['เ', 'แ', 'โ', 'ใ', 'ไ']
  if (leadingVowels.includes(firstChar) && name.length > 1) {
    firstChar = name.charAt(1)
  }
  firstChar = firstChar.toUpperCase()

  if (/[ก-จ]/.test(firstChar)) return 'ก-จ'
  if (/[ฉ-ณ]/.test(firstChar)) return 'ฉ-ณ'
  if (/[ด-บ]/.test(firstChar)) return 'ด-บ'
  if (/[ป-ม]/.test(firstChar)) return 'ป-ม'
  if (/[ย-ว]/.test(firstChar)) return 'ย-ว'
  if (/[ศ-ฮ]/.test(firstChar)) return 'ศ-ฮ'
  if (/[0-9]/.test(firstChar)) return '0-9'
  if (/[A-Z]/.test(firstChar)) return 'A-Z'
  return 'อื่นๆ'
}

type Channel = 'Cash (เงินสด)' | 'Grab' | 'LINE MAN'

const CHANNEL_OPTIONS: { label: string; value: Channel }[] = [
  { label: 'หน้าร้าน', value: 'Cash (เงินสด)' },
  { label: 'Grab', value: 'Grab' },
  { label: 'LINE MAN', value: 'LINE MAN' },
]

const priceFor = (p: { priceCash: number; priceGrab: number; priceLineman: number }, channel: Channel) => {
  if (channel === 'Grab') return p.priceGrab
  if (channel === 'LINE MAN') return p.priceLineman
  return p.priceCash
}

export default function POSPage() {
  // ประกาศ State ของการขาย
  const [channel, setChannel] = useState<Channel>('Cash (เงินสด)')
  const [searchText, setSearchText] = useState('')
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderId, setOrderId] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isCheckoutSaving, setIsCheckoutSaving] = useState(false)
  const gridScrollRef = useRef<HTMLDivElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    let active = true
    fetch('/api/products', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load products')
        return res.json() as Promise<{ products: Product[] }>
      })
      .then((data) => {
        if (active) setProducts(data.products)
      })
      .catch((error) => {
        console.error(error)
        if (active) setAlertModal({ open: true, title: 'โหลดข้อมูลไม่สำเร็จ', message: 'ไม่สามารถโหลดรายการสินค้าจากฐานข้อมูลได้' })
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  // 12 รายการ/หน้า (จอเล็ก) หรือ 16 รายการ/หน้า (จอ xl ขึ้นไป) — สลับอัตโนมัติเมื่อขนาดจอเปลี่ยน
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const apply = () => setItemsPerPage(mq.matches ? 16 : 12)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // กรองตามกลุ่มตัวอักษร → กรองตามชื่อ → เรียงตามพจนานุกรมไทย/อังกฤษ
  const filtered = useMemo(() => {
    let list = products
    if (activeGroup) {
      list = list.filter((p) => getCharacterGroup(p.name) === activeGroup)
    }
    const query = searchText.toLowerCase().trim()
    if (query) {
      list = list.filter((p) => p.name != null && String(p.name).toLowerCase().includes(query))
    }
    return [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'th', { sensitivity: 'base' }))
  }, [products, activeGroup, searchText])

  // ตัดแบ่งหน้า แล้วจัดเรียงตามลำดับกลุ่ม (ไม่มีหัวกลุ่ม)
  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const slice = filtered.slice(startIndex, startIndex + itemsPerPage)
    const grouped: Record<string, Product[]> = {}
    slice.forEach((p) => {
      const g = getCharacterGroup(p.name)
      if (!grouped[g]) grouped[g] = []
      grouped[g].push(p)
    })
    return GROUP_ORDER.flatMap((g) => grouped[g] ?? [])
  }, [filtered, currentPage, itemsPerPage])

  // คำนวณยอดรวมในตะกร้าตามช่องทางขายปัจจุบัน และค่า GP
  const { totalItemsCount, totalPriceSum, gpAmount, netRevenue } = useMemo(() => {
    let count = 0
    let sum = 0
    cart.forEach((item) => {
      count += item.qty
      sum += priceFor(item, channel) * item.qty
    })
    const gpRate = gpRateForChannel(channel)
    const gp = sum * gpRate
    const net = sum - gp
    return {
      totalItemsCount: count,
      totalPriceSum: sum,
      gpAmount: Math.round(gp * 100) / 100,
      netRevenue: Math.round(net * 100) / 100,
    }
  }, [cart, channel])

  const showAlertModal = (title: string, message: string) => setAlertModal({ open: true, title, message })

  const setPage = (page: number) => {
    setCurrentPage(page)
    if (gridScrollRef.current) gridScrollRef.current.scrollTop = 0
  }

  const handleSearch = (value: string) => {
    setSearchText(value)
    setCurrentPage(1)
  }

  const handleSetGroup = (group: string | null) => {
    setActiveGroup(group)
    setCurrentPage(1)
    if (gridScrollRef.current) gridScrollRef.current.scrollTop = 0
  }

  // เพิ่มสินค้าเข้าตะกร้า (ตรวจสอบสต็อกก่อน)
  const addToCart = (product: Product) => {
    if (!product.id) {
      showAlertModal('ไม่พบรหัสสินค้า', 'ไม่สามารถเพิ่มสินค้านี้ลงตะกร้าได้')
      return
    }
    const productId = product.id

    const existingItem = cart.find((item) => item.productId === productId)
    if (existingItem && existingItem.qty >= Number(product.currentStock)) {
      showAlertModal('สต็อกไม่เพียงพอ', 'ไม่สามารถเพิ่มสินค้าได้เนื่องจากเกินจำนวนสต็อกที่มีอยู่')
      return
    }

    setCart((prev) => {
      const latestItem = prev.find((item) => item.productId === productId)
      if (latestItem) {
        if (latestItem.qty >= Number(product.currentStock)) return prev
        return prev.map((item) => (item.productId === productId ? { ...item, qty: item.qty + 1 } : item))
      }

      return [
        ...prev,
        {
          productId,
          name: product.name,
          cost: product.cost,
          priceCash: product.priceCash,
          priceGrab: product.priceGrab,
          priceLineman: product.priceLineman,
          qty: 1,
        },
      ]
    })
  }

  // ปรับจำนวนสินค้าในตะกร้า (+/-)
  const updateCartItemQty = (productId: string, amount: number) => {
    const originalProduct = products.find((p) => p.id === productId)
    const maxStock = Number(originalProduct?.currentStock ?? 0)
    const currentItem = cart.find((i) => i.productId === productId)
    if (amount > 0 && originalProduct && currentItem && currentItem.qty >= maxStock) {
      showAlertModal('สต็อกไม่เพียงพอ', 'สินค้าในคลังมีไม่เพียงพอ')
      return
    }

    setCart((prev) => {
      const item = prev.find((i) => i.productId === productId)
      if (!item) return prev
      if (amount > 0 && originalProduct && item.qty >= maxStock) {
        return prev
      }

      return prev
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty + amount } : i))
        .filter((i) => i.qty > 0)
    })
  }

  const checkoutOrder = () => {
    if (cart.length === 0) {
      showAlertModal('ตะกร้าว่างเปล่า', 'กรุณาเลือกสินค้าลงตะกร้าก่อนทำรายการชำระเงิน')
      return
    }
    setConfirmOpen(true)
  }

  const checkoutOrderMobile = () => {
    if (cart.length === 0) {
      showAlertModal('ตะกร้าว่างเปล่า', 'กรุณาเลือกสินค้าลงตะกร้าก่อนทำรายการชำระเงิน')
      return
    }
    setMobileCartOpen(false)
    // หน่วงให้ sheet ปิดก่อนแล้วค่อยเปิด confirm modal
    setTimeout(() => setConfirmOpen(true), 320)
  }

  const loadProducts = async () => {
    const res = await fetch('/api/products', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to load products')
    const data = await res.json() as { products: Product[] }
    setProducts(data.products)
  }

  const executeCheckout = async () => {
    setConfirmOpen(false)
    setIsCheckoutSaving(true)

    let finalOrderId = orderId.trim()
    if (!finalOrderId) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let randStr = ''
      for (let j = 0; j < 12; j++) {
        randStr += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      finalOrderId = 'ORD-' + randStr
    }

    const gpRate = gpRateForChannel(channel)

    // Prepare sale line items with full financial breakdown (ready for DB insert)
    const saleLines = cart.map((item) => {
      const unitPrice = priceFor(item, channel)
      return {
        productName: item.name,
        ...computeSaleLine(unitPrice, item.cost, item.qty, gpRate),
        unitPrice,
        unitCost: item.cost,
        gpPercent: gpRate,
      }
    })

    const totalNetProfit = saleLines.reduce((s, line) => s + line.netProfit, 0)

    try {
      const response = await fetch('/api/sales-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: finalOrderId,
          channel,
          note: orderNote.trim(),
          items: cart.map((item) => ({ productId: item.productId, qty: item.qty })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'บันทึกคำสั่งซื้อไม่สำเร็จ')

      await loadProducts()
      window.localStorage.setItem('myb:last-sale-at', String(Date.now()))
      setCart([])
      setOrderId('')
      setOrderNote('')
      setSearchText('')
      setActiveGroup(null)
      setCurrentPage(1)
      showAlertModal('บันทึกคำสั่งซื้อสำเร็จ!', `เลขที่ธุรกรรม: ${data.orderId || finalOrderId}\nค่าธรรมเนียม GP: ${GP_RATE_PERCENT[channel] || '0%'} | กำไรสุทธิ: ${thbFormat(totalNetProfit)}`)
    } catch (error) {
      showAlertModal('บันทึกคำสั่งซื้อไม่สำเร็จ', error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsCheckoutSaving(false)
    }
  }

  const displayOrderId = orderId.trim() || '(รันเลขอัตโนมัติ)'

  // เนื้อหาตะกร้า (ใช้ร่วม desktop aside / mobile drawer)
  const renderCartItems = (compact: boolean) =>
    cart.length === 0 ? (
      compact ? (
        <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
          <ShoppingCartOutlined className="text-[48px] opacity-30 mb-3" />
          <p className="font-body-sm">ตะกร้าว่างเปล่า</p>
        </div>
      ) : (
        <div className="text-center text-on-surface-variant py-lg font-body-sm">ตะกร้าว่างเปล่า</div>
      )
    ) : (
      cart.map((item) => {
        const price = priceFor(item, channel)
        return compact ? (
          <div key={item.name} className="flex justify-between items-center bg-surface-container-low rounded-xl px-3 py-2.5 border border-outline-variant/40">
            <div className="flex-1 pr-2 min-w-0">
              <h4 className="font-body-md font-semibold text-on-surface line-clamp-1">{item.name}</h4>
              <p className="font-label-md text-secondary mt-0.5">{thbFormat(price)}</p>
            </div>
            <div className="flex items-center gap-1 border border-outline-variant rounded-xl p-1 bg-surface flex-shrink-0">
              <button
                onClick={() => updateCartItemQty(item.productId, -1)}
                className="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-variant active:bg-secondary-container active:text-secondary rounded-lg transition-colors font-extrabold"
              >
                <MinusOutlined className="text-[14px] stroke-[2.5]" />
              </button>
              <span className="w-7 text-center text-[15px] leading-7 font-extrabold tabular-nums text-primary">{item.qty}</span>
              <button
                onClick={() => updateCartItemQty(item.productId, 1)}
                className="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-variant active:bg-secondary-container active:text-secondary rounded-lg transition-colors font-extrabold"
              >
                <PlusOutlined className="text-[14px] stroke-[2.5]" />
              </button>
            </div>
          </div>
        ) : (
          <div key={item.name} className="flex justify-between items-start border-b border-outline-variant/10 pb-sm">
            <div className="flex-1 pr-2">
              <h4 className="font-body-md font-semibold text-on-surface line-clamp-2">{item.name}</h4>
              <p className="font-label-md text-secondary mt-0.5">{thbFormat(price)}</p>
            </div>
            <div className="flex items-center space-x-1 border border-outline-variant rounded-lg p-1 bg-surface">
              <button
                onClick={() => updateCartItemQty(item.productId, -1)}
                className="w-6 h-6 flex items-center justify-center text-on-surface hover:bg-surface-variant active:bg-secondary-container active:text-secondary rounded transition-colors font-extrabold"
              >
                <MinusOutlined className="text-[14px] stroke-[2.5]" />
              </button>
              <span className="w-6 text-center text-[14px] leading-6 font-extrabold tabular-nums text-primary">{item.qty}</span>
              <button
                onClick={() => updateCartItemQty(item.productId, 1)}
                className="w-6 h-6 flex items-center justify-center text-on-surface hover:bg-surface-variant active:bg-secondary-container active:text-secondary rounded transition-colors font-extrabold"
              >
                <PlusOutlined className="text-[14px] stroke-[2.5]" />
              </button>
            </div>
          </div>
        )
      })
    )

  // แสดง loading ระหว่างรอโหลดข้อมูล
  if (isLoading) return <Loader text="กำลังโหลดรายการสินค้า POS..." />

  return (
    <>
      <div className="flex flex-col h-full bg-background overflow-hidden p-margin-mobile lg:p-lg">
        {/* ROW 1: แถบเลือกช่องทางขาย */}
        <div className="flex flex-col lg:flex-row flex-shrink-0 mb-md mt-sm lg:mt-md">
          <div className="flex-1 lg:pr-md px-1 md:px-2">
            <Segmented
              block
              value={channel}
              onChange={(val) => setChannel(val as Channel)}
              options={CHANNEL_OPTIONS}
              className="w-full font-label-sm"
            />
          </div>
          <div className="hidden lg:block w-[300px] xl:w-[350px] flex-shrink-0 lg:pl-md"></div>
        </div>

        {/* ROW 2: คอนเทนต์หลัก (ซ้าย: ค้นหา+สินค้า, ขวา: ออเดอร์ปัจจุบัน) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Column 1 (ซ้าย): ค้นหา และ การ์ดสินค้า */}
          <div className="flex-1 flex flex-col h-full overflow-hidden lg:pr-md relative">
            {/* ช่องค้นหาชื่อสินค้า */}
            <div className="py-2 mb-sm flex-shrink-0 flex justify-center lg:justify-start pl-1 md:pl-2">
              <Input
                prefix={<FilterOutlined className="text-on-surface-variant" />}
                placeholder="ค้นหาชื่อสินค้า..."
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
                className="w-full max-w-[360px] shadow-sm font-body-sm"
              />
            </div>

            {/* แถบปุ่มเลือกหมวดหมู่ตัวอักษร */}
            <div className="flex-shrink-0 pb-2 pl-1 md:pl-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {[null, ...ALL_GROUPS].map((g) => {
                  const isActive = activeGroup === g
                  return (
                    <button
                      key={g ?? '__all__'}
                      onClick={() => handleSetGroup(g)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-label-sm whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-secondary-container/40 text-secondary border-secondary/60 font-bold border'
                          : 'text-on-surface-variant bg-surface-container-lowest border border-outline-variant/50 hover:bg-secondary-container/30 hover:text-secondary hover:border-secondary/40'
                      }`}
                    >
                      {g ?? 'ทั้งหมด'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ตะแกรงแสดงการ์ดสินค้า */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32 lg:pb-20" ref={gridScrollRef}>
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-xs md:gap-sm lg:gap-md p-1 md:p-2">
                {pageItems.map((product) => {
                  const displayPrice = priceFor(product, channel)
                  const isOut =
                    Number(product.currentStock) <= 0 || product.status === 'Out of Stock' || product.status === 'สินค้าหมด'

                  if (isOut) {
                    return (
                      <article
                        key={product.name}
                        className="bg-surface-container-lowest rounded-xl p-2 md:p-3 lg:p-3 xl:p-5 xl:pb-8 shadow-sm-card border border-outline-variant/80 flex flex-col opacity-60 cursor-not-allowed select-none"
                      >
                        <div className="aspect-square w-full rounded-lg bg-surface-container-low overflow-hidden mb-2 md:mb-3 lg:mb-3 xl:mb-[16px] relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={product.name}
                            className="w-full h-full object-cover grayscale"
                            src={productImageSrc(product.image)}
                            onError={(e) => { e.currentTarget.src = FALLBACK_IMG }}
                          />
                          <div className="absolute top-xs left-xs bg-error-container/90 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded text-[8px] md:text-[10px] font-label-sm text-on-error-container font-bold">หมด</div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-body-sm md:text-body-md text-on-surface break-words mb-0.5">{product.name}</h3>
                          <div className="text-body-sm md:text-body-md text-on-surface-variant">{thbFormat(displayPrice)}</div>
                        </div>
                      </article>
                    )
                  }
                  return (
                    <article
                      key={product.name}
                      onClick={() => addToCart(product)}
                      className="bg-surface-container-lowest rounded-xl p-2 md:p-3 lg:p-3 xl:p-5 xl:pb-8 shadow-sm-card border border-outline-variant/80 flex flex-col cursor-pointer transition-all hover:scale-[1.02] hover:shadow-premium hover:border-primary/50 active:scale-[0.98] select-none duration-200"
                    >
                      <div className="aspect-square w-full rounded-lg bg-surface-container-low overflow-hidden mb-2 md:mb-3 lg:mb-3 xl:mb-[16px] relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={product.name}
                          className="w-full h-full object-cover"
                          src={productImageSrc(product.image)}
                          onError={(e) => { e.currentTarget.src = FALLBACK_IMG }}
                        />
                        <div className="absolute top-xs left-xs bg-secondary-container/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded text-[8px] md:text-[10px] font-label-sm text-secondary font-bold">
                          <span className="hidden xl:inline">สต็อก: </span>{product.currentStock}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-body-sm md:text-body-md text-on-surface break-words mb-0.5">{product.name}</h3>
                        <div className="text-body-sm md:text-body-md text-secondary">{thbFormat(displayPrice)}</div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            {/* ส่วนควบคุมการเปลี่ยนหน้า POS */}
            <div className="absolute bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-surface border border-outline-variant/20 rounded-xl lg:rounded-2xl shadow-premium px-2 py-1.5 lg:px-3 lg:py-2 w-fit mx-auto">
                <Pagination
                  current={currentPage}
                  pageSize={itemsPerPage}
                  total={filtered.length}
                  onChange={setPage}
                  showSizeChanger={false}
                  size="small"
                />
              </div>
            </div>
          </div>

          {/* Column 2 (ขวา): ออเดอร์ปัจจุบัน */}
          <aside className="hidden lg:flex w-[300px] xl:w-[350px] flex-col overflow-hidden h-full lg:pl-md flex-shrink-0 transition-all duration-300">
            <div className="flex-1 bg-surface-container-lowest shadow-card border border-outline-variant/80 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-lg border-b border-outline-variant/30 bg-surface space-y-sm">
                <h2 className="font-headline-sm text-on-surface flex justify-between items-center">
                  ออเดอร์ปัจจุบัน
                  <span className="bg-primary text-on-primary text-xs px-2 py-1 rounded-full font-label-sm">{totalItemsCount} รายการ</span>
                </h2>
                <Input
                  prefix={<TagOutlined className="text-on-surface-variant" />}
                  placeholder="เลขออเดอร์..."
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="shadow-sm font-body-sm"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-md space-y-md">{renderCartItems(false)}</div>

              <div className="p-lg bg-surface-container-low border-t border-outline-variant/30">
                <div className="relative mb-3">
                  <FormOutlined className="absolute left-2.5 top-2.5 text-on-surface-variant text-[16px] pointer-events-none z-10" />
                  <Input.TextArea
                    placeholder="ใส่หมายเหตุ..."
                    rows={2}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className="shadow-sm font-body-sm"
                    style={{ paddingLeft: 32, resize: 'none' }}
                  />
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-body-md text-on-surface-variant">ช่องทางขาย</span>
                  <span className="font-label-md text-secondary font-bold">{channel}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-body-md text-on-surface-variant">ยอดรวม</span>
                  <span className="font-label-md text-on-surface">{thbFormat(totalPriceSum)}</span>
                </div>
                {gpAmount > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-body-md text-on-surface-variant">ค่าธรรมเนียม GP ({GP_RATE_PERCENT[channel] || '0%'})</span>
                    <span className="font-label-md text-error">{thbFormat(gpAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-outline-variant/50 pt-4 mb-3">
                  <span className="font-headline-sm text-on-surface">ยอดรับสุทธิ</span>
                  <span className="font-headline-md text-secondary font-bold">{thbFormat(gpAmount > 0 ? netRevenue : totalPriceSum)}</span>
                </div>
                <Button
                  size="large"
                  block
                  icon={<TransactionOutlined />}
                  onClick={checkoutOrder}
                  className="ant-btn-secondary-solid font-headline-sm interactive-press"
                >
                  บันทึกคำสั่งซื้อ
                </Button>
              </div>
            </div>
          </aside>
        </div>

        {/* ปุ่มดูตะกร้าลอยด้านล่าง (Mobile) */}
        <div className="lg:hidden fixed bottom-[90px] left-0 w-full px-margin-mobile z-30">
          <button
            onClick={() => setMobileCartOpen(!mobileCartOpen)}
            className="w-full bg-secondary text-on-secondary rounded-xl py-md px-lg shadow-lg flex justify-between items-center interactive-press"
          >
            <div className="flex items-center gap-sm font-label-md text-label-md">
              <ShoppingCartOutlined className="text-[18px]" />
              <span>{totalItemsCount} รายการ</span>
            </div>
            <div className="font-label-md text-label-md font-bold">ดูตะกร้า • <span>{thbFormat(gpAmount > 0 ? netRevenue : totalPriceSum)}</span></div>
          </button>
        </div>
      </div>

      {/* ==================== Mobile Cart Bottom Sheet (antd Drawer) ==================== */}
      <Drawer
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        placement="bottom"
        size="90dvh"
        closeIcon={null}
        rootClassName="lg:hidden"
        styles={{
          header: { display: 'none' },
          body: { padding: 0, display: 'flex', flexDirection: 'column' },
          section: { borderRadius: '24px 24px 0 0', overflow: 'hidden' },
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-outline-variant"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/30 flex-shrink-0">
          <h2 className="font-headline-sm text-on-surface">ออเดอร์ปัจจุบัน</h2>
          <div className="flex items-center gap-2">
            <span className="bg-primary text-on-primary text-xs px-2.5 py-1 rounded-full font-label-sm">{totalItemsCount} รายการ</span>
            <button
              onClick={() => setMobileCartOpen(false)}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <CloseOutlined className="text-[16px]" />
            </button>
          </div>
        </div>

        {/* Order ID Input */}
        <div className="px-5 pt-3 pb-0 flex-shrink-0">
          <Input
            prefix={<TagOutlined className="text-on-surface-variant" />}
            placeholder="เลขออเดอร์ (ไม่ระบุ = รันอัตโนมัติ)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="shadow-sm font-body-sm"
          />
        </div>

        {/* Cart Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-0">{renderCartItems(true)}</div>

        {/* Footer Summary */}
        <div
          className="flex-shrink-0 px-5 pt-3 border-t border-outline-variant/30 bg-surface-container-low/60 space-y-3"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          <div className="relative">
            <FormOutlined className="absolute left-3 top-2.5 text-on-surface-variant text-[16px] pointer-events-none z-10" />
            <Input.TextArea
              placeholder="ใส่หมายเหตุ..."
              rows={2}
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              className="shadow-sm font-body-sm"
              style={{ paddingLeft: 34, resize: 'none' }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-body-sm text-on-surface-variant">ช่องทางขาย</span>
              <span className="font-label-md text-secondary font-bold">{channel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-body-sm text-on-surface-variant">ยอดรวม</span>
              <span className="font-label-md text-on-surface">{thbFormat(totalPriceSum)}</span>
            </div>
            {gpAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-body-sm text-on-surface-variant">ค่าธรรมเนียม GP ({GP_RATE_PERCENT[channel] || '0%'})</span>
                <span className="font-label-md text-error">{thbFormat(gpAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-outline-variant/40 pt-2">
              <span className="font-headline-sm text-on-surface">ยอดรับสุทธิ</span>
              <span className="font-headline-sm text-secondary font-bold">{thbFormat(gpAmount > 0 ? netRevenue : totalPriceSum)}</span>
            </div>
          </div>

          <Button
            size="large"
            block
            icon={<TransactionOutlined />}
            onClick={checkoutOrderMobile}
            className="ant-btn-secondary-solid font-headline-sm interactive-press"
          >
            บันทึกคำสั่งซื้อ
          </Button>
        </div>
      </Drawer>

      {/* ==================== Alert Modal ==================== */}
      <Modal
        open={alertModal.open}
        onCancel={() => setAlertModal({ ...alertModal, open: false })}
        centered
        width={384}
        closable={false}
        title={
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-error-container/40 flex items-center justify-center text-error flex-shrink-0">
              <ExclamationCircleOutlined className="text-[22px]" />
            </div>
            <span className="font-headline-sm text-on-surface">{alertModal.title}</span>
          </div>
        }
        footer={
          <Button
            block
            icon={<CheckOutlined />}
            onClick={() => setAlertModal({ ...alertModal, open: false })}
            className="ant-btn-secondary-solid h-11"
          >
            ตกลง
          </Button>
        }
      >
        <p className="text-sm text-on-surface-variant">{alertModal.message}</p>
      </Modal>

      {/* ==================== Checkout Confirm Modal ==================== */}
      <Modal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        centered
        width={420}
        closable={false}
        title={
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary flex-shrink-0">
              <ShoppingCartOutlined className="text-[22px]" />
            </div>
            <div>
              <div className="font-headline-sm text-on-surface">ยืนยันการสั่งซื้อ</div>
              <div className="text-xs text-on-surface-variant mt-0.5 font-normal">โปรดตรวจสอบรายละเอียดข้อมูลคำสั่งซื้อ</div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button block onClick={() => setConfirmOpen(false)} className="h-11 ant-btn-cancel-soft">
              ยกเลิก
            </Button>
            <Button block icon={<CheckCircleOutlined />} loading={isCheckoutSaving} onClick={executeCheckout} className="ant-btn-secondary-solid h-11">
              ยืนยันการสั่งซื้อ
            </Button>
          </div>
        }
      >
        <div className="bg-surface-container-low rounded-xl p-4 space-y-2 border border-outline-variant/30">
          <div className="flex justify-between items-center text-sm">
            <span className="text-on-surface-variant font-medium">เลขออเดอร์:</span>
            <span className="font-bold text-on-surface">{displayOrderId}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-on-surface-variant font-medium">ช่องทางขาย:</span>
            <span className="font-bold text-secondary">{channel}</span>
          </div>

          <div className="flex flex-col text-sm border-t border-outline-variant/30 pt-2 gap-1.5">
            <span className="text-on-surface-variant font-bold">รายการสินค้า:</span>
            <div className="max-h-24 overflow-y-auto space-y-1 p-2 bg-white rounded-lg border border-outline-variant/50 divide-y divide-outline-variant/10">
              {cart.map((item) => (
                <div key={item.name} className="flex justify-between items-center text-xs py-1">
                  <div className="truncate pr-2 max-w-[160px] font-medium text-on-surface">{item.name}</div>
                  <div className="text-on-surface-variant font-medium flex-shrink-0">{item.qty} x {thbFormat(priceFor(item, channel))}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-outline-variant/30 pt-2 text-sm">
            <span className="text-on-surface-variant font-medium">จำนวนสินค้า:</span>
            <span className="font-bold text-on-surface">{totalItemsCount} ชิ้น</span>
          </div>
          <div className="flex flex-col text-sm border-t border-outline-variant/30 pt-2 gap-0.5">
            <span className="text-on-surface-variant font-medium">หมายเหตุ:</span>
            <span className="font-normal text-on-surface-variant text-xs bg-white rounded-lg p-2 mt-1 border border-outline-variant/50 max-h-16 overflow-y-auto no-scrollbar">
              {orderNote.trim() || 'ไม่มีหมายเหตุ'}
            </span>
          </div>
          {gpAmount > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-on-surface-variant font-medium">ค่าธรรมเนียม GP ({GP_RATE_PERCENT[channel] || '0%'}):</span>
              <span className="font-bold text-error">{thbFormat(gpAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-outline-variant/30 pt-2 text-sm">
            <span className="text-on-surface-variant font-medium">ยอดรับสุทธิ:</span>
            <span className="font-extrabold text-secondary text-body-lg">{thbFormat(gpAmount > 0 ? netRevenue : totalPriceSum)}</span>
          </div>
        </div>
      </Modal>
    </>
  )
}

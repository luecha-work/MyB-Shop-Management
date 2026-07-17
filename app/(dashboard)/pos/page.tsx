'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// ==========================================
// Types & Mock Data (รอเชื่อมต่อ Google Sheets ผ่าน Server Action)
// ==========================================
type Product = {
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
  name: string
  cost: number
  priceCash: number
  priceGrab: number
  priceLineman: number
  qty: number
}

const FALLBACK_IMG = 'https://placehold.co/400x400/eceef0/7c839b?text=No+Image'

const MOCK_PRODUCTS: Product[] = [
  { name: 'กาแฟเย็น', cost: 15, priceCash: 30, priceGrab: 40, priceLineman: 38, currentStock: 20, status: 'Active', image: FALLBACK_IMG },
  { name: 'ข้าวกล่องกะเพราไก่', cost: 35, priceCash: 60, priceGrab: 75, priceLineman: 72, currentStock: 12, status: 'Active', image: FALLBACK_IMG },
  { name: 'ข้าวเหนียวหมูปิ้ง', cost: 18, priceCash: 30, priceGrab: 40, priceLineman: 38, currentStock: 15, status: 'Active', image: FALLBACK_IMG },
  { name: 'ไก่ทอด', cost: 12, priceCash: 20, priceGrab: 28, priceLineman: 26, currentStock: 30, status: 'Active', image: FALLBACK_IMG },
  { name: 'ชาไทยเย็น', cost: 14, priceCash: 30, priceGrab: 40, priceLineman: 38, currentStock: 18, status: 'Active', image: FALLBACK_IMG },
  { name: 'เฉาก๊วยนมสด', cost: 10, priceCash: 25, priceGrab: 34, priceLineman: 32, currentStock: 10, status: 'Active', image: FALLBACK_IMG },
  { name: 'แซนด์วิชแฮมชีส', cost: 22, priceCash: 39, priceGrab: 52, priceLineman: 49, currentStock: 8, status: 'Active', image: FALLBACK_IMG },
  { name: 'น้ำเปล่า 600ml', cost: 5, priceCash: 10, priceGrab: 15, priceLineman: 14, currentStock: 48, status: 'Active', image: FALLBACK_IMG },
  { name: 'นมเย็น', cost: 14, priceCash: 30, priceGrab: 40, priceLineman: 38, currentStock: 0, status: 'Out of Stock', image: FALLBACK_IMG },
  { name: 'โดนัทช็อกโกแลต', cost: 12, priceCash: 25, priceGrab: 34, priceLineman: 32, currentStock: 14, status: 'Active', image: FALLBACK_IMG },
  { name: 'ผัดไทยกุ้งสด', cost: 40, priceCash: 70, priceGrab: 89, priceLineman: 85, currentStock: 9, status: 'Active', image: FALLBACK_IMG },
  { name: 'มาม่าต้มยำทะเล', cost: 30, priceCash: 55, priceGrab: 70, priceLineman: 67, currentStock: 11, status: 'Active', image: FALLBACK_IMG },
  { name: 'ลูกชิ้นปิ้ง', cost: 15, priceCash: 25, priceGrab: 34, priceLineman: 32, currentStock: 25, status: 'Active', image: FALLBACK_IMG },
  { name: 'วุ้นมะพร้าว', cost: 8, priceCash: 15, priceGrab: 22, priceLineman: 20, currentStock: 16, status: 'Active', image: FALLBACK_IMG },
  { name: 'ยำมาม่า', cost: 25, priceCash: 45, priceGrab: 58, priceLineman: 55, currentStock: 7, status: 'Active', image: FALLBACK_IMG },
  { name: 'ส้มตำไทย', cost: 25, priceCash: 45, priceGrab: 58, priceLineman: 55, currentStock: 13, status: 'Active', image: FALLBACK_IMG },
  { name: 'หมูปิ้งไม้', cost: 7, priceCash: 12, priceGrab: 17, priceLineman: 16, currentStock: 40, status: 'Active', image: FALLBACK_IMG },
  { name: '7-Up กระป๋อง', cost: 10, priceCash: 18, priceGrab: 25, priceLineman: 23, currentStock: 24, status: 'Active', image: FALLBACK_IMG },
  { name: 'Coke Zero', cost: 12, priceCash: 20, priceGrab: 28, priceLineman: 26, currentStock: 22, status: 'Active', image: FALLBACK_IMG },
  { name: 'Pepsi กระป๋อง', cost: 10, priceCash: 18, priceGrab: 25, priceLineman: 23, currentStock: 19, status: 'Active', image: FALLBACK_IMG },
]

const _thbFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })
const thbFormat = (val: number) => (isNaN(Number(val)) ? '-' : _thbFormatter.format(Number(val)))

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

const CHANNELS: { id: string; label: string; value: Channel }[] = [
  { id: 'cash', label: 'หน้าร้าน', value: 'Cash (เงินสด)' },
  { id: 'grab', label: 'Grab', value: 'Grab' },
  { id: 'lineman', label: 'LINE MAN', value: 'LINE MAN' },
]

const priceFor = (p: { priceCash: number; priceGrab: number; priceLineman: number }, channel: Channel) => {
  if (channel === 'Grab') return p.priceGrab
  if (channel === 'LINE MAN') return p.priceLineman
  return p.priceCash
}

// ==========================================
// ส่วนควบคุมการเปลี่ยนหน้า POS (ดีไซน์ตามโมเดล Flowbite พร้อมปุ่มตัวเลขและ ellipses)
// ==========================================
function PosPagination({
  totalItems, currentPage, itemsPerPage, onPage,
}: {
  totalItems: number; currentPage: number; itemsPerPage: number; onPage: (page: number) => void
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const btnSizeClass = 'w-8 h-8 lg:w-10 lg:h-10 text-[10px] lg:text-xs'

  const jumpToPage = (value: string) => {
    const page = parseInt(value, 10)
    if (!isNaN(page)) onPage(Math.min(Math.max(page, 1), totalPages))
  }

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
      className="flex justify-center items-center p-1.5 lg:p-2.5 bg-surface border border-outline-variant/20 rounded-xl lg:rounded-2xl shadow-premium mx-auto w-fit"
      aria-label="Table navigation"
    >
      <ul className="flex -space-x-px justify-center items-center">
        <li>
          <button
            onClick={() => onPage(currentPage - 1)}
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
                onClick={() => onPage(p)}
                className={`flex items-center justify-center text-on-surface-variant bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 font-semibold transition-colors ${btnSizeClass}`}
              >
                {p}
              </button>
            )}
          </li>
        ))}
        <li>
          <button
            onClick={() => onPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`flex items-center justify-center text-on-surface bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:hover:bg-surface-container border border-outline-variant/40 font-bold rounded-e-lg ${btnSizeClass} transition-colors`}
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px] select-none pointer-events-none">chevron_right</span>
          </button>
        </li>
      </ul>
    </nav>
  )
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
  const gridScrollRef = useRef<HTMLDivElement>(null)

  const products = MOCK_PRODUCTS

  // 12 รายการ/หน้า (จอเล็ก) หรือ 16 รายการ/หน้า (จอ xl ขึ้นไป) — สลับอัตโนมัติเมื่อขนาดจอเปลี่ยน
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const apply = () => setItemsPerPage(mq.matches ? 16 : 12)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // ล็อกการ scroll ของ body ระหว่างเปิด Mobile Cart Sheet
  useEffect(() => {
    document.body.style.overflow = mobileCartOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileCartOpen])

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

  // คำนวณยอดรวมในตะกร้าตามช่องทางขายปัจจุบัน
  const { totalItemsCount, totalPriceSum } = useMemo(() => {
    let count = 0
    let sum = 0
    cart.forEach((item) => {
      count += item.qty
      sum += priceFor(item, channel) * item.qty
    })
    return { totalItemsCount: count, totalPriceSum: sum }
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
    const existingItem = cart.find((item) => item.name === product.name)
    if (existingItem) {
      if (existingItem.qty >= Number(product.currentStock)) {
        showAlertModal('สต็อกไม่เพียงพอ', 'ไม่สามารถเพิ่มสินค้าได้เนื่องจากเกินจำนวนสต็อกที่มีอยู่')
        return
      }
      setCart(cart.map((item) => (item.name === product.name ? { ...item, qty: item.qty + 1 } : item)))
    } else {
      setCart([
        ...cart,
        {
          name: product.name,
          cost: product.cost,
          priceCash: product.priceCash,
          priceGrab: product.priceGrab,
          priceLineman: product.priceLineman,
          qty: 1,
        },
      ])
    }
  }

  // ปรับจำนวนสินค้าในตะกร้า (+/-)
  const updateCartItemQty = (name: string, amount: number) => {
    const item = cart.find((i) => i.name === name)
    if (!item) return
    const originalProduct = products.find((p) => p.name === name)
    if (originalProduct && amount > 0 && item.qty >= Number(originalProduct.currentStock)) {
      showAlertModal('สต็อกไม่เพียงพอ', 'สินค้าในคลังมีไม่เพียงพอ')
      return
    }
    setCart(
      cart
        .map((i) => (i.name === name ? { ...i, qty: i.qty + amount } : i))
        .filter((i) => i.qty > 0),
    )
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

  // TODO: เชื่อม Server Action submitOrder (Google Sheets) แทนการจำลองผลสำเร็จ
  const executeCheckout = () => {
    setConfirmOpen(false)

    let finalOrderId = orderId.trim()
    if (!finalOrderId) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let randStr = ''
      for (let j = 0; j < 12; j++) {
        randStr += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      finalOrderId = 'ORD-' + randStr
    }

    // ล้างตะกร้าและฟอร์มทั้งหมดกลับค่าเริ่มต้น
    setCart([])
    setOrderId('')
    setOrderNote('')
    setSearchText('')
    setActiveGroup(null)
    setCurrentPage(1)
    showAlertModal('บันทึกคำสั่งซื้อสำเร็จ!', 'เลขที่ธุรกรรม: ' + finalOrderId)
  }

  const displayOrderId = orderId.trim() || '(รันเลขอัตโนมัติ)'

  return (
    <>
      <div className="flex flex-col h-full bg-background overflow-hidden p-margin-mobile lg:p-lg">
        {/* ROW 1: แถบเลือกช่องทางขาย */}
        <div className="flex flex-col lg:flex-row flex-shrink-0 mb-md mt-sm lg:mt-md">
          <div className="flex-1 lg:pr-md px-1 md:px-2">
            <div className="flex items-center gap-xs bg-surface-container border border-outline-variant/30 p-1 rounded-xl w-full">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setChannel(ch.value)}
                  className={
                    channel === ch.value
                      ? 'flex-1 text-center py-2 rounded-lg font-label-sm text-secondary bg-surface-container-lowest font-bold shadow-sm transition-all'
                      : 'flex-1 text-center py-2 rounded-lg font-label-sm text-on-surface-variant hover:bg-surface-container-high transition-all'
                  }
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden lg:block w-[300px] xl:w-[350px] flex-shrink-0 lg:pl-md"></div>
        </div>

        {/* ROW 2: คอนเทนต์หลัก (ซ้าย: ค้นหา+สินค้า, ขวา: ออเดอร์ปัจจุบัน) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Column 1 (ซ้าย): ค้นหา และ การ์ดสินค้า */}
          <div className="flex-1 flex flex-col h-full overflow-hidden lg:pr-md relative">
            {/* ช่องค้นหาชื่อสินค้า */}
            <div className="py-2 mb-sm flex-shrink-0 flex justify-center lg:justify-start pl-1 md:pl-2">
              <div className="relative w-full max-w-[360px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">filter_list</span>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสินค้า..."
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all shadow-sm"
                />
              </div>
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
                            src={product.image}
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
                          src={product.image}
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
              <PosPagination totalItems={filtered.length} currentPage={currentPage} itemsPerPage={itemsPerPage} onPage={setPage} />
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
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">tag</span>
                  <input
                    type="text"
                    placeholder="เลขออเดอร์..."
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full h-10 pl-8 pr-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-md space-y-md">
                {cart.length === 0 ? (
                  <div className="text-center text-on-surface-variant py-lg font-body-sm">ตะกร้าว่างเปล่า</div>
                ) : (
                  cart.map((item) => {
                    const price = priceFor(item, channel)
                    return (
                      <div key={item.name} className="flex justify-between items-start border-b border-outline-variant/10 pb-sm">
                        <div className="flex-1 pr-2">
                          <h4 className="font-body-md font-semibold text-on-surface line-clamp-2">{item.name}</h4>
                          <p className="font-label-md text-secondary mt-0.5">{thbFormat(price)}</p>
                        </div>
                        <div className="flex items-center space-x-1 border border-outline-variant rounded-lg p-1 bg-surface">
                          <button
                            onClick={() => updateCartItemQty(item.name, -1)}
                            className="w-6 h-6 flex items-center justify-center text-on-surface hover:bg-surface-variant rounded transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">remove</span>
                          </button>
                          <span className="font-label-md w-6 text-center font-bold">{item.qty}</span>
                          <button
                            onClick={() => updateCartItemQty(item.name, 1)}
                            className="w-6 h-6 flex items-center justify-center text-on-surface hover:bg-surface-variant rounded transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="p-lg bg-surface-container-low border-t border-outline-variant/30">
                <div className="relative mb-3">
                  <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-on-surface-variant text-[18px] pointer-events-none">notes</span>
                  <textarea
                    placeholder="ใส่หมายเหตุ..."
                    rows={2}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all shadow-sm resize-none"
                  ></textarea>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-body-md text-on-surface-variant">ช่องทางขาย</span>
                  <span className="font-label-md text-secondary font-bold">{channel}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-body-md text-on-surface-variant">ยอดรวม</span>
                  <span className="font-label-md text-on-surface">{thbFormat(totalPriceSum)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-outline-variant/50 pt-4 mb-3">
                  <span className="font-headline-sm text-on-surface">ยอดสุทธิ</span>
                  <span className="font-headline-md text-secondary font-bold">{thbFormat(totalPriceSum)}</span>
                </div>
                <button
                  onClick={checkoutOrder}
                  className="w-full bg-secondary hover:bg-secondary/90 text-on-secondary font-headline-sm py-3 rounded-xl interactive-press flex items-center justify-center shadow-sm"
                >
                  <span className="material-symbols-outlined mr-2">point_of_sale</span> บันทึกคำสั่งซื้อ
                </button>
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
              <span className="material-symbols-outlined filled">shopping_cart</span>
              <span>{totalItemsCount} รายการ</span>
            </div>
            <div className="font-label-md text-label-md font-bold">ดูตะกร้า • <span>{thbFormat(totalPriceSum)}</span></div>
          </button>
        </div>
      </div>

      {/* ==================== Mobile Cart Bottom Sheet ==================== */}
      <div className={`lg:hidden fixed inset-0 z-50 ${mobileCartOpen ? '' : 'pointer-events-none'}`} aria-modal="true" role="dialog">
        <div
          onClick={() => setMobileCartOpen(false)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${mobileCartOpen ? 'opacity-100' : 'opacity-0'}`}
        ></div>
        <div
          className={`absolute bottom-0 left-0 w-full bg-surface rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-300 ease-out ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ maxHeight: '90dvh' }}
        >
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-outline-variant"></div>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/30 flex-shrink-0">
            <h2 className="font-headline-sm text-on-surface">ออเดอร์ปัจจุบัน</h2>
            <div className="flex items-center gap-2">
              <span className="bg-primary text-on-primary text-xs px-2.5 py-1 rounded-full font-label-sm">{totalItemsCount} รายการ</span>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          <div className="px-5 pt-3 pb-0 flex-shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">tag</span>
              <input
                type="text"
                placeholder="เลขออเดอร์ (ไม่ระบุ = รันอัตโนมัติ)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-3">shopping_cart</span>
                <p className="font-body-sm">ตะกร้าว่างเปล่า</p>
              </div>
            ) : (
              cart.map((item) => {
                const price = priceFor(item, channel)
                return (
                  <div key={item.name} className="flex justify-between items-center bg-surface-container-low rounded-xl px-3 py-2.5 border border-outline-variant/40">
                    <div className="flex-1 pr-2 min-w-0">
                      <h4 className="font-body-md font-semibold text-on-surface line-clamp-1">{item.name}</h4>
                      <p className="font-label-md text-secondary mt-0.5">{thbFormat(price)}</p>
                    </div>
                    <div className="flex items-center gap-1 border border-outline-variant rounded-xl p-1 bg-surface flex-shrink-0">
                      <button
                        onClick={() => updateCartItemQty(item.name, -1)}
                        className="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="font-label-md w-7 text-center font-bold">{item.qty}</span>
                      <button
                        onClick={() => updateCartItemQty(item.name, 1)}
                        className="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div
            className="flex-shrink-0 px-5 pt-3 border-t border-outline-variant/30 bg-surface-container-low/60 space-y-3"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px] pointer-events-none">notes</span>
              <textarea
                placeholder="ใส่หมายเหตุ..."
                rows={2}
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-secondary focus:ring-1 focus:ring-secondary outline-none font-body-sm text-on-surface placeholder:text-on-surface-variant/60 transition-all shadow-sm resize-none"
              ></textarea>
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
              <div className="flex justify-between items-center border-t border-outline-variant/40 pt-2">
                <span className="font-headline-sm text-on-surface">ยอดสุทธิ</span>
                <span className="font-headline-sm text-secondary font-bold">{thbFormat(totalPriceSum)}</span>
              </div>
            </div>

            <button
              onClick={checkoutOrderMobile}
              className="w-full bg-secondary hover:bg-secondary/90 text-on-secondary font-headline-sm py-3.5 rounded-2xl interactive-press flex items-center justify-center gap-2 shadow-md"
            >
              <span className="material-symbols-outlined">point_of_sale</span>
              บันทึกคำสั่งซื้อ
            </button>
          </div>
        </div>
      </div>

      {/* ==================== Alert Modal ==================== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${alertModal.open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setAlertModal({ ...alertModal, open: false })} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className={`relative z-10 w-full max-w-sm bg-surface rounded-2xl shadow-premium overflow-hidden flex flex-col transition-transform duration-200 ${alertModal.open ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center gap-3 px-6 pt-6 pb-4">
            <div className="w-11 h-11 rounded-xl bg-error-container/40 flex items-center justify-center text-error flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">error_outline</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-on-surface">{alertModal.title}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{alertModal.message}</p>
            </div>
          </div>
          <div className="flex px-6 py-4 border-t border-outline-variant/20 bg-surface">
            <button
              onClick={() => setAlertModal({ ...alertModal, open: false })}
              className="flex-1 h-11 rounded-xl bg-secondary text-on-secondary font-body-md font-medium hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              ตกลง
            </button>
          </div>
        </div>
      </div>

      {/* ==================== Checkout Confirm Modal ==================== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${confirmOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div onClick={() => setConfirmOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className={`relative z-10 w-full max-w-sm bg-surface rounded-2xl shadow-premium overflow-hidden flex flex-col transition-transform duration-200 ${confirmOpen ? 'scale-100' : 'scale-95'}`}>
          <div className="flex items-center gap-3 px-6 pt-6 pb-4">
            <div className="w-11 h-11 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">shopping_cart_checkout</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-on-surface">ยืนยันการสั่งซื้อ</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">โปรดตรวจสอบรายละเอียดข้อมูลคำสั่งซื้อ</p>
            </div>
          </div>

          <div className="px-6 pb-4 space-y-3">
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
              <div className="flex justify-between items-center border-t border-outline-variant/30 pt-2 text-sm">
                <span className="text-on-surface-variant font-medium">ยอดรวมสุทธิ:</span>
                <span className="font-extrabold text-secondary text-body-lg">{thbFormat(totalPriceSum)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20 bg-surface">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 h-11 rounded-xl border border-outline-variant text-on-surface-variant font-body-md font-medium hover:bg-surface-container-low transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={executeCheckout}
              className="flex-1 h-11 rounded-xl bg-secondary text-on-secondary font-body-md font-medium hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              ยืนยันการสั่งซื้อ
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import {
  DollarOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
  AccountBookOutlined,
  ShopOutlined,
  RiseOutlined,
  FallOutlined,
  ProfileOutlined,
} from '@ant-design/icons'
import { Loader } from '@/components/UI/Loader'

type DashboardStats = {
  totalSales: number
  netRevenue: number
  totalCost: number
  netProfit: number
  channelSales: { name: string; sales: number }[]
  topProducts: { name: string; qty: number; sales: number }[]
}

const EMPTY_STATS: DashboardStats = {
  totalSales: 0,
  netRevenue: 0,
  totalCost: 0,
  netProfit: 0,
  channelSales: [],
  topProducts: [],
}

const _thbFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })
const thbFormat = (val: number) => (isNaN(Number(val)) ? '-' : _thbFormatter.format(Number(val)))

const toLocalISODate = (d: Date) => {
  const z = (n: number) => ('0' + n).slice(-2)
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

// สีแท่งกราฟช่องทางการขาย (logic เดิมจาก script.html)
const channelColor = (name: string, colorIdx: { i: number }) => {
  const defaultColors = ['#f6c38b', '#f68eb3', '#8bf6d6']
  const lowerName = name.toLowerCase()
  if (lowerName.includes('grab')) return '#8bd0a5'
  if (lowerName.includes('line')) return '#b3b1f5'
  if (lowerName.includes('cash') || lowerName.includes('เงินสด')) return '#8bb4f6'
  return defaultColors[colorIdx.i++ % defaultColors.length]
}

// เหรียญรางวัลอันดับ 1-5 (SVG ชุดเดิม)
const RANK_COLORS = [
  { ribbonL: '#E74C3C', ribbonR: '#C0392B', circle: '#F1C40F', stroke: '#F39C12', ringOpacity: 0.4, text: '#FFFFFF' },
  { ribbonL: '#5499C7', ribbonR: '#2980B9', circle: '#ECF0F1', stroke: '#BDC3C7', ringOpacity: 0.6, text: '#2C3E50' },
  { ribbonL: '#58D68D', ribbonR: '#27AE60', circle: '#E67E22', stroke: '#D35400', ringOpacity: 0.4, text: '#FFFFFF' },
  { ribbonL: '#F8C471', ribbonR: '#E67E22', circle: '#34495E', stroke: '#2C3E50', ringOpacity: 0.3, text: '#FFFFFF' },
  { ribbonL: '#BB8FCE', ribbonR: '#8E44AD', circle: '#95A5A6', stroke: '#7F8C8D', ringOpacity: 0.3, text: '#FFFFFF' },
]

function RankBadge({ rank }: { rank: number }) {
  const c = RANK_COLORS[rank - 1]
  if (!c) {
    return (
      <div className="w-12 h-12 rounded-xl bg-surface-container-high text-on-surface-variant font-bold text-lg flex items-center justify-center flex-shrink-0">
        {rank}
      </div>
    )
  }
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 22 L10 42 L18 38 L24 42 V22 Z" fill={c.ribbonL} />
      <path d="M32 22 L38 42 L30 38 L24 42 V22 Z" fill={c.ribbonR} />
      <circle cx="24" cy="20" r="15" fill={c.circle} stroke={c.stroke} strokeWidth="2" />
      <circle cx="24" cy="20" r="11" fill="none" stroke="#FFFFFF" strokeOpacity={c.ringOpacity} strokeWidth="1.5" />
      <text x="24" y="25.5" fontFamily="'Manrope', sans-serif" fontWeight="900" fontSize="16" fill={c.text} textAnchor="middle">
        {rank}
      </text>
    </svg>
  )
}

// การ์ดสรุปยอด (Bento Grid)
function StatCard({
  icon, iconBg, iconColor, badgeIcon, badgeText, badgeClass, label, value, sub,
}: {
  icon: React.ReactNode; iconBg: string; iconColor: string
  badgeIcon: React.ReactNode; badgeText: string; badgeClass: string
  label: string; value: string; sub: string
}) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-card border border-outline-variant/80 flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px]" style={{ backgroundColor: iconBg, color: iconColor }}>
          {icon}
        </div>
        <div className={`${badgeClass} px-2.5 py-1 rounded-full font-label-sm font-bold flex items-center gap-1`}>
          <span className="text-[13px] flex items-center">{badgeIcon}</span> {badgeText}
        </div>
      </div>
      <div className="font-body-md text-on-surface-variant mb-1 font-medium">{label}</div>
      <div className="text-lg xl:text-[28px] xl:leading-[36px] text-primary font-bold mb-1 truncate">{value}</div>
      <div className="font-label-md text-outline">{sub}</div>
    </div>
  )
}

export default function DashboardPage() {
  const now = new Date()
  const [startDate, setStartDate] = useState(toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [endDate, setEndDate] = useState(toLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    fetch(`/api/dashboard?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load dashboard stats')
        return res.json() as Promise<DashboardStats>
      })
      .then((data) => {
        if (!active) return
        setLoadError('')
        setStats(data)
      })
      .catch((error) => {
        console.error(error)
        if (!active) return
        setLoadError('โหลดข้อมูลแดชบอร์ดจากฐานข้อมูลไม่สำเร็จ')
        setStats(EMPTY_STATS)
      })
    return () => { active = false }
  }, [startDate, endDate])

  // แสดง loading ระหว่างรอโหลดข้อมูล
  if (!stats) return <Loader text="โหลดข้อมูลแดชบอร์ด..." />

  const data = stats
  const ts = data.totalSales || 0
  const chCount = data.channelSales.length
  const prCount = data.topProducts.length
  const revenueRate = ts > 0 ? (data.netRevenue / ts) * 100 : 0
  const costRate = ts > 0 ? (data.totalCost / ts) * 100 : 0
  const profitMargin = ts > 0 ? (data.netProfit / ts) * 100 : 0
  const isProfitPositive = data.netProfit >= 0

  const channelTotal = data.channelSales.reduce((s, ch) => s + ch.sales, 0)
  const colorIdx = { i: 0 }
  const channels = [...data.channelSales]
    .sort((a, b) => b.sales - a.sales)
    .map((ch) => ({
      ...ch,
      percent: channelTotal > 0 ? (ch.sales / channelTotal) * 100 : 0,
      color: channelColor(ch.name, colorIdx),
    }))

  return (
    <div className="h-full flex flex-col p-margin-mobile md:p-margin-desktop w-full overflow-y-auto no-scrollbar bg-background">
      {loadError && <div className="mb-md rounded-xl border border-error/20 bg-error-container/20 p-3 text-sm font-medium text-error">{loadError}</div>}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-md mb-xl flex-shrink-0">
        <div className="hidden md:flex items-stretch gap-4">
          <div className="w-[6px] bg-gradient-to-b from-secondary to-secondary/30 rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(118,90,36,0.2)]"></div>
          <div>
            <h2 className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-xs">ภาพรวมยอดขาย</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-0.5">สรุปผลการดำเนินงานและสถิติสำคัญ</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white p-3 md:p-4 rounded-xl border border-outline-variant/80 shadow-card w-full lg:w-auto">
          <div className="flex items-center gap-3 justify-start flex-1 lg:flex-initial">
            <label htmlFor="dash-start-date" className="w-[70px] flex-shrink-0 font-body-md font-bold text-on-surface-variant whitespace-nowrap">เริ่มต้น:</label>
            <DatePicker
              id="dash-start-date"
              value={startDate ? dayjs(startDate) : null}
              onChange={(d) => setStartDate(d ? d.format('YYYY-MM-DD') : '')}
              format="DD/MM/YYYY"
              allowClear={false}
              className="h-11 flex-1 lg:flex-initial lg:w-[170px] bg-surface-container-low"
            />
          </div>
          <div className="flex items-center gap-3 justify-start flex-1 lg:flex-initial">
            <label htmlFor="dash-end-date" className="w-[70px] flex-shrink-0 font-body-md font-bold text-on-surface-variant whitespace-nowrap">สิ้นสุด:</label>
            <DatePicker
              id="dash-end-date"
              value={endDate ? dayjs(endDate) : null}
              onChange={(d) => setEndDate(d ? d.format('YYYY-MM-DD') : '')}
              format="DD/MM/YYYY"
              allowClear={false}
              className="h-11 flex-1 lg:flex-initial lg:w-[170px] bg-surface-container-low"
            />
          </div>
        </div>
      </div>

      {/* Bento Grid: Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-6">
        <StatCard
          icon={<DollarOutlined />} iconBg="#e6f0ff" iconColor="#4b96ff"
          badgeIcon={<ShopOutlined />} badgeText={`${chCount} ช่องทาง`} badgeClass="bg-[#e6f4ea] text-[#1e8e3e]"
          label="ยอดขายรวม" value={thbFormat(data.totalSales)}
          sub={chCount > 0 ? 'จากทุกช่องทาง' : 'ยังไม่มียอดขาย'}
        />
        <StatCard
          icon={<ShoppingCartOutlined />} iconBg="#e6f4ea" iconColor="#1e8e3e"
          badgeIcon={<RiseOutlined />} badgeText={`${revenueRate.toFixed(1)}%`} badgeClass="bg-[#e6f4ea] text-[#1e8e3e]"
          label="รายได้สุทธิ" value={thbFormat(data.netRevenue)} sub="หลังหักค่า GP"
        />
        <StatCard
          icon={<WalletOutlined />} iconBg="#f3e8ff" iconColor="#a855f7"
          badgeIcon={<ProfileOutlined />} badgeText={`${costRate.toFixed(1)}%`} badgeClass="bg-[#f3e8ff] text-[#a855f7]"
          label="ต้นทุน" value={thbFormat(data.totalCost)} sub="ของยอดขายรวม"
        />
        <StatCard
          icon={<AccountBookOutlined />} iconBg="#ffedd5" iconColor="#f97316"
          badgeIcon={isProfitPositive ? <RiseOutlined /> : <FallOutlined />}
          badgeText={`${profitMargin.toFixed(1)}%`}
          badgeClass={isProfitPositive ? 'bg-[#e6f4ea] text-[#1e8e3e]' : 'bg-[#fdeded] text-[#ba1a1a]'}
          label="กำไรสุทธิ" value={thbFormat(data.netProfit)} sub={ts > 0 ? 'กำไรขั้นต้น' : '-'}
        />
      </div>

      {/* Lower Grid: Channel & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 pb-10 md:pb-0">
        {/* Sales by Channel (ยอดขายตามช่องทาง 60%) */}
        <div className="bg-white p-6 rounded-xl shadow-card border border-outline-variant/80 lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline-sm text-primary">ยอดขายตามช่องทาง</h3>
            <span className="font-body-sm text-outline">{chCount > 0 ? `${chCount} ช่องทาง` : 'รอข้อมูล'}</span>
          </div>
          <div className="flex-1 flex flex-col justify-start gap-8 px-2">
            {channels.length === 0 && <div className="text-center text-outline text-sm">ไม่มีข้อมูล</div>}
            {channels.map((ch) => (
              <div key={ch.name}>
                <div className="flex justify-between items-end mb-2">
                  <span className="font-body-md font-semibold text-on-surface">{ch.name}</span>
                  <span className="font-body-md text-on-surface-variant font-bold">
                    <span className="text-secondary mr-1.5">{thbFormat(ch.sales)}</span>
                    <span className="text-outline">({ch.percent.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-[#f0f2f5] h-6 rounded-md overflow-hidden relative">
                  <div className="h-full rounded-md" style={{ backgroundColor: ch.color, width: `${ch.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products List (สินค้าขายดี 40%) */}
        <div className="bg-white p-6 rounded-xl shadow-card border border-outline-variant/80 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-sm text-primary">สินค้าขายดี</h3>
            <span className="font-body-sm text-outline">{prCount > 0 ? `${prCount} อันดับแรก` : 'รอข้อมูล'}</span>
          </div>
          <div className="flex flex-col gap-0">
            {data.topProducts.length === 0 && <div className="text-center text-outline text-sm py-4">ไม่มีข้อมูล</div>}
            {data.topProducts.map((pr, i) => (
              <div
                key={pr.name}
                className={`flex items-center justify-between py-5 ${i === data.topProducts.length - 1 ? '' : 'border-b border-surface-variant/30'}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <RankBadge rank={i + 1} />
                  <div className="min-w-0">
                    <div className="font-body-md font-medium text-on-surface mb-0.5 break-words" title={pr.name}>{pr.name}</div>
                    <div className="font-label-md text-outline">{pr.qty} sold</div>
                  </div>
                </div>
                <div className="font-body-lg font-bold text-on-surface flex-shrink-0">{thbFormat(pr.sales)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

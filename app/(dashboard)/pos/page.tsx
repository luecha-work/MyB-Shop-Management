'use client'

import { useState } from 'react'
import { Card } from '@/components/UI/Card'

export default function POSPage() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  
  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-24 lg:pb-0 relative">
      {/* Products Section */}
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full">
        {/* Search and Filter */}
        <div className="p-4 bg-surface border-b border-surface-container flex flex-col gap-3 flex-shrink-0 z-10 shadow-sm">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input 
              type="text" 
              placeholder="ค้นหาสินค้า..." 
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-3 pl-10 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md shadow-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button className={`px-4 py-1.5 rounded-full font-label-md whitespace-nowrap interactive-press ${!activeGroup ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`} onClick={() => setActiveGroup(null)}>ทั้งหมด</button>
            <button className={`px-4 py-1.5 rounded-full font-label-md whitespace-nowrap interactive-press ${activeGroup === 'ก-จ' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`} onClick={() => setActiveGroup('ก-จ')}>ก-จ</button>
            <button className={`px-4 py-1.5 rounded-full font-label-md whitespace-nowrap interactive-press ${activeGroup === 'A-Z' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`} onClick={() => setActiveGroup('A-Z')}>A-Z</button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 bg-background">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Dummy Product */}
            <Card className="overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-md transition-shadow">
              <div className="aspect-square bg-surface-container-low relative w-full flex items-center justify-center overflow-hidden">
                <span className="material-symbols-outlined text-[48px] text-outline-variant">image</span>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-body-md font-bold text-on-surface line-clamp-2 mb-1">สินค้าทดสอบ</h3>
                <div className="mt-auto flex justify-between items-end">
                  <span className="text-secondary font-bold">฿100.00</span>
                  <span className="text-label-sm text-outline">คงเหลือ: 10</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Cart Section (Right Sidebar on Desktop, Hidden on Mobile until opened) */}
      <div className="hidden lg:flex flex-col w-[340px] xl:w-[400px] bg-surface border-l border-surface-container shadow-sidebar flex-shrink-0 relative z-20">
        <div className="p-4 border-b border-surface-container bg-surface-container-lowest">
          <h2 className="font-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined">shopping_cart</span>
            ตะกร้าสินค้า
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 bg-background">
          <div className="text-center text-outline text-sm mt-10">ยังไม่มีสินค้าในตะกร้า</div>
        </div>

        <div className="p-4 bg-surface border-t border-surface-container shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-10 flex flex-col gap-3">
          <div className="flex justify-between items-center text-body-md">
            <span className="text-on-surface-variant">รวมเงิน</span>
            <span className="font-bold text-on-surface">฿0.00</span>
          </div>
          <button className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-body-lg interactive-press">
            ชำระเงิน
          </button>
        </div>
      </div>
    </div>
  )
}

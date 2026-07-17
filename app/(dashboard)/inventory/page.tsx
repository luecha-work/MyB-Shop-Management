'use client'

import { Card } from '@/components/UI/Card'

export default function InventoryPage() {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8 p-4 lg:p-8">
      <div className="max-w-container-max mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-highest shadow-sm">
          <div>
            <h2 className="font-headline-md text-on-surface">คลังสินค้า</h2>
            <p className="text-on-surface-variant font-body-sm mt-1">จัดการข้อมูลสินค้าและสต็อก</p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input type="text" placeholder="ค้นหาสินค้า..." className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 pl-10 pr-4 outline-none focus:border-primary font-body-sm" />
            </div>
            <button className="bg-primary text-on-primary px-4 py-2 rounded-lg font-bold flex items-center gap-2 interactive-press whitespace-nowrap">
              <span className="material-symbols-outlined text-[20px]">add</span>
              เพิ่มสินค้า
            </button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md border-b border-outline-variant/30">
                  <th className="p-4">รูปภาพ</th>
                  <th className="p-4">ชื่อสินค้า</th>
                  <th className="p-4">สต็อกคงเหลือ</th>
                  <th className="p-4">สถานะ</th>
                  <th className="p-4 text-right">ราคา (เงินสด)</th>
                  <th className="p-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant/10 hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="p-4"><div className="w-12 h-12 bg-surface-container rounded-lg"></div></td>
                  <td className="p-4 font-body-md font-medium text-on-surface">สินค้าทดสอบ</td>
                  <td className="p-4 font-body-md">10</td>
                  <td className="p-4">
                    <span className="bg-[#e6f4ea] text-[#1e8e3e] px-2 py-1 rounded-full text-[10px] font-bold">Active</span>
                  </td>
                  <td className="p-4 text-right font-body-md">฿100.00</td>
                  <td className="p-4 text-center">
                    <button className="text-secondary hover:text-secondary-container transition-colors"><span className="material-symbols-outlined">edit</span></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

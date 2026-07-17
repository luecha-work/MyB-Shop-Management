'use client'

import { Card } from '@/components/UI/Card'

export default function StockInPage() {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8 p-4 lg:p-8">
      <div className="max-w-container-max mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-highest shadow-sm">
          <div>
            <h2 className="font-headline-md text-on-surface">บันทึกรับเข้าคลัง</h2>
            <p className="text-on-surface-variant font-body-sm mt-1">ประวัติการเพิ่มสต็อกสินค้า</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex gap-2">
              <input type="date" className="flex-1 bg-surface-container-low text-on-surface border border-outline-variant rounded-lg px-3 py-2 font-body-sm outline-none focus:border-primary" />
              <input type="date" className="flex-1 bg-surface-container-low text-on-surface border border-outline-variant rounded-lg px-3 py-2 font-body-sm outline-none focus:border-primary" />
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md border-b border-outline-variant/30">
                  <th className="p-4">วันที่ - เวลา</th>
                  <th className="p-4">สินค้า</th>
                  <th className="p-4 text-center">จำนวนรับเข้า</th>
                  <th className="p-4">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-outline-variant/10 hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="p-4 font-body-sm text-on-surface-variant">2026-07-17 09:00</td>
                  <td className="p-4 font-body-md">สินค้าทดสอบ</td>
                  <td className="p-4 text-center font-body-md text-[#1e8e3e] font-bold">+10</td>
                  <td className="p-4 font-body-sm text-on-surface-variant">สต็อกเริ่มต้น</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

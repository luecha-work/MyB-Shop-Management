'use client'

import { Card, DatePicker, Button } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

export default function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8 p-4 lg:p-8">
      <div className="max-w-container-max mx-auto space-y-6">
        
        {/* Header and Date Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-highest shadow-sm">
          <div>
            <h2 className="font-headline-md text-on-surface m-0">ภาพรวมยอดขาย</h2>
            <p className="text-on-surface-variant font-body-sm mt-1 mb-0">ข้อมูลสถิติการขายและต้นทุน</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DatePicker.RangePicker className="flex-1 sm:w-auto font-body-md" style={{ height: 40 }} />
            <Button type="primary" icon={<SearchOutlined />} style={{ height: 40, borderRadius: 8 }}>
              ค้นหา
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="borderless" className="shadow-sm overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-secondary/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <p className="text-on-surface-variant font-label-md font-bold mb-1">ยอดขายรวม</p>
            <h3 className="font-headline-xl text-primary leading-tight m-0">฿0.00</h3>
          </Card>
          
          <Card variant="borderless" className="shadow-sm overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#1e8e3e]/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <p className="text-on-surface-variant font-label-md font-bold mb-1">รายได้สุทธิ</p>
            <h3 className="font-headline-xl text-[#1e8e3e] leading-tight m-0">฿0.00</h3>
          </Card>
          
          <Card variant="borderless" className="shadow-sm overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-error/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <p className="text-on-surface-variant font-label-md font-bold mb-1">ต้นทุนรวม</p>
            <h3 className="font-headline-xl text-error leading-tight m-0">฿0.00</h3>
          </Card>
          
          <Card variant="borderless" className="shadow-sm overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <p className="text-on-surface-variant font-label-md font-bold mb-1">กำไรสุทธิ</p>
            <h3 className="font-headline-xl text-primary leading-tight m-0">฿0.00</h3>
          </Card>
        </div>
      </div>
    </div>
  )
}

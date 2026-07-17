'use client'

import { Card, DatePicker, Table } from 'antd'

export default function StockInPage() {
  const columns = [
    {
      title: 'วันที่ - เวลา',
      dataIndex: 'timestamp',
      key: 'timestamp',
      className: 'text-on-surface-variant',
    },
    {
      title: 'สินค้า',
      dataIndex: 'product',
      key: 'product',
      className: 'font-bold text-on-surface',
    },
    {
      title: 'จำนวนรับเข้า',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center' as const,
      className: 'font-bold text-[#1e8e3e]',
    },
    {
      title: 'หมายเหตุ',
      dataIndex: 'note',
      key: 'note',
      className: 'text-on-surface-variant',
    },
  ]

  const data = [
    {
      key: '1',
      timestamp: '2026-07-17 09:00',
      product: 'สินค้าทดสอบ',
      quantity: '+10',
      note: 'สต็อกเริ่มต้น',
    }
  ]

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8 p-4 lg:p-8">
      <div className="max-w-container-max mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-highest shadow-sm">
          <div>
            <h2 className="font-headline-md text-on-surface m-0">บันทึกรับเข้าคลัง</h2>
            <p className="text-on-surface-variant font-body-sm mt-1 mb-0">ประวัติการเพิ่มสต็อกสินค้า</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DatePicker.RangePicker className="flex-1 font-body-sm" style={{ borderRadius: 8, height: 40 }} />
          </div>
        </div>

        <Card variant="borderless" className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <Table 
            columns={columns} 
            dataSource={data} 
            pagination={false}
            scroll={{ x: 800 }}
            className="font-body-md"
          />
        </Card>
      </div>
    </div>
  )
}

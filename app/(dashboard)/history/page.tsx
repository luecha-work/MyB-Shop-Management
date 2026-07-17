'use client'

import { Card, Input, DatePicker, Table, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

export default function HistoryPage() {
  const columns = [
    {
      title: 'วันที่ - เวลา',
      dataIndex: 'timestamp',
      key: 'timestamp',
      className: 'text-on-surface-variant',
    },
    {
      title: 'รหัสคำสั่งซื้อ',
      dataIndex: 'orderId',
      key: 'orderId',
      className: 'font-bold text-on-surface',
    },
    {
      title: 'ช่องทาง',
      dataIndex: 'channel',
      key: 'channel',
      render: (channel: string) => (
        <Tag color="processing" className="font-bold border-none bg-primary/10 text-primary">
          {channel}
        </Tag>
      ),
    },
    {
      title: 'สินค้า',
      dataIndex: 'product',
      key: 'product',
    },
    {
      title: 'จำนวน',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center' as const,
    },
    {
      title: 'ยอดรวม',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      className: 'font-bold text-secondary',
    },
  ]

  const data = [
    {
      key: '1',
      timestamp: '2026-07-17 10:00',
      orderId: 'ORD-001',
      channel: 'Cash',
      product: 'สินค้าทดสอบ',
      quantity: 1,
      total: '฿100.00',
    }
  ]

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8 p-4 lg:p-8">
      <div className="max-w-container-max mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-highest shadow-sm">
          <div>
            <h2 className="font-headline-md text-on-surface m-0">ประวัติการขาย</h2>
            <p className="text-on-surface-variant font-body-sm mt-1 mb-0">ดูรายการขายย้อนหลัง</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DatePicker.RangePicker className="flex-1 font-body-sm" style={{ borderRadius: 8, height: 40 }} />
            <Input 
              prefix={<SearchOutlined className="text-outline-variant" />}
              placeholder="ค้นหารหัสคำสั่งซื้อ..." 
              className="flex-1 font-body-sm"
              style={{ borderRadius: 8, height: 40 }}
            />
          </div>
        </div>

        <Card bordered={false} className="shadow-sm" bodyStyle={{ padding: 0 }}>
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

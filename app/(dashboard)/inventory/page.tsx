'use client'

import { Card, Input, Button, Table, Tag } from 'antd'
import { SearchOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'

export default function InventoryPage() {
  const columns = [
    {
      title: 'รูปภาพ',
      dataIndex: 'image',
      key: 'image',
      render: () => <div className="w-10 h-10 bg-surface-container rounded-lg"></div>,
    },
    {
      title: 'ชื่อสินค้า',
      dataIndex: 'name',
      key: 'name',
      className: 'font-bold text-on-surface',
    },
    {
      title: 'สต็อกคงเหลือ',
      dataIndex: 'stock',
      key: 'stock',
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color="success" className="font-bold border-none bg-[#e6f4ea] text-[#1e8e3e]">
          {status}
        </Tag>
      ),
    },
    {
      title: 'ราคา (เงินสด)',
      dataIndex: 'price',
      key: 'price',
      align: 'right' as const,
    },
    {
      title: 'จัดการ',
      key: 'action',
      align: 'center' as const,
      render: () => (
        <Button type="text" icon={<EditOutlined />} className="text-secondary" />
      ),
    },
  ]

  const data = [
    {
      key: '1',
      name: 'สินค้าทดสอบ',
      stock: 10,
      status: 'Active',
      price: '฿100.00',
    }
  ]

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-8 p-4 lg:p-8">
      <div className="max-w-container-max mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-surface-container-highest shadow-sm">
          <div>
            <h2 className="font-headline-md text-on-surface m-0">คลังสินค้า</h2>
            <p className="text-on-surface-variant font-body-sm mt-1 mb-0">จัดการข้อมูลสินค้าและสต็อก</p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <Input 
              prefix={<SearchOutlined className="text-outline-variant" />}
              placeholder="ค้นหาสินค้า..." 
              className="flex-1 sm:w-64 font-body-sm"
              style={{ borderRadius: 8, height: 40 }}
            />
            <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8, height: 40 }} className="font-bold">
              เพิ่มสินค้า
            </Button>
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

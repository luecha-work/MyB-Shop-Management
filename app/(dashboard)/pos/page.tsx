'use client'

import { useState } from 'react'
import { Card, Input, Button, Empty } from 'antd'
import { SearchOutlined, ShoppingCartOutlined, PictureOutlined } from '@ant-design/icons'

export default function POSPage() {
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  
  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-24 lg:pb-0 relative">
      {/* Products Section */}
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full">
        {/* Search and Filter */}
        <div className="p-4 bg-surface border-b border-surface-container flex flex-col gap-3 flex-shrink-0 z-10 shadow-sm">
          <Input 
            size="large"
            placeholder="ค้นหาสินค้า..." 
            prefix={<SearchOutlined className="text-outline-variant" />}
            className="w-full bg-surface-container-lowest font-body-md"
            style={{ borderRadius: 12 }}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <Button 
              type={!activeGroup ? 'primary' : 'default'}
              shape="round" 
              onClick={() => setActiveGroup(null)}
              className={!activeGroup ? '' : 'bg-surface-container-low border-none text-on-surface-variant'}
            >
              ทั้งหมด
            </Button>
            <Button 
              type={activeGroup === 'ก-จ' ? 'primary' : 'default'}
              shape="round" 
              onClick={() => setActiveGroup('ก-จ')}
              className={activeGroup === 'ก-จ' ? '' : 'bg-surface-container-low border-none text-on-surface-variant'}
            >
              ก-จ
            </Button>
            <Button 
              type={activeGroup === 'A-Z' ? 'primary' : 'default'}
              shape="round" 
              onClick={() => setActiveGroup('A-Z')}
              className={activeGroup === 'A-Z' ? '' : 'bg-surface-container-low border-none text-on-surface-variant'}
            >
              A-Z
            </Button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 bg-background">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Dummy Product */}
            <Card 
              hoverable 
              styles={{ body: { padding: 12, display: 'flex', flexDirection: 'column', flex: 1 } }}
              className="overflow-hidden flex flex-col h-full border-outline-variant/50"
              cover={
                <div className="aspect-square bg-surface-container-low relative w-full flex items-center justify-center overflow-hidden">
                  <PictureOutlined className="text-[48px] text-outline-variant" />
                </div>
              }
            >
              <h3 className="font-body-md font-bold text-on-surface line-clamp-2 mb-1 m-0">สินค้าทดสอบ</h3>
              <div className="mt-auto flex justify-between items-end pt-2">
                <span className="text-secondary font-bold">฿100.00</span>
                <span className="text-label-sm text-outline">คงเหลือ: 10</span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="hidden lg:flex flex-col w-[340px] xl:w-[400px] bg-surface border-l border-surface-container shadow-sidebar flex-shrink-0 relative z-20">
        <div className="p-4 border-b border-surface-container bg-surface-container-lowest">
          <h2 className="font-headline-sm font-bold text-on-surface flex items-center gap-2 m-0">
            <ShoppingCartOutlined />
            ตะกร้าสินค้า
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col justify-center items-center bg-background">
          <Empty description={<span className="text-outline">ยังไม่มีสินค้าในตะกร้า</span>} />
        </div>

        <div className="p-4 bg-surface border-t border-surface-container shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-10 flex flex-col gap-3">
          <div className="flex justify-between items-center text-body-md">
            <span className="text-on-surface-variant">รวมเงิน</span>
            <span className="font-bold text-on-surface">฿0.00</span>
          </div>
          <Button type="primary" size="large" className="w-full font-bold text-body-lg h-12 rounded-xl">
            ชำระเงิน
          </Button>
        </div>
      </div>
    </div>
  )
}

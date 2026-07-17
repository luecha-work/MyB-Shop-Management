'use client'

import { ConfigProvider } from 'antd'
import thTH from 'antd/locale/th_TH'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

dayjs.locale('th')

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={thTH}
      theme={{
        token: {
          colorPrimary: '#000000', // Black as primary brand color
          colorInfo: '#000000',
          colorSuccess: '#1e8e3e',
          colorWarning: '#f29900',
          colorError: '#ba1a1a',
          colorText: '#191c1e', // on-surface
          colorTextSecondary: '#45464d', // on-surface-variant
          colorBgContainer: '#ffffff',
          colorBorder: '#c6c6cd', // outline-variant
          borderRadius: 12, // match rounded-xl
          borderRadiusLG: 16,
          wireframe: false,
          fontFamily: 'var(--font-inter), var(--font-manrope), sans-serif',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', // shadow-card
          boxShadowSecondary: '0 12px 36px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)', // shadow-premium
        },
        components: {
          Card: {
            colorBgContainer: 'var(--color-surface, #ffffff)',
            colorBorderSecondary: 'var(--color-outline-variant, #c6c6cd)',
            borderRadiusLG: 16,
            boxShadowTertiary: '0px 2px 8px rgba(0,0,0,0.05)',
          },
          Button: {
            controlHeight: 40,
            controlHeightLG: 48,
            controlHeightSM: 32,
            borderRadius: 8,
            borderRadiusLG: 12,
            fontWeight: 500,
          },
          Input: {
            controlHeight: 40,
            controlHeightLG: 44,
            borderRadius: 12,
            colorBorder: 'var(--color-outline-variant, #c6c6cd)',
            // focus/hover เป็นสีทอง secondary ตามดีไซน์เดิม
            colorPrimary: '#765a24',
            activeBorderColor: '#765a24',
            hoverBorderColor: '#765a24',
          },
          InputNumber: {
            controlHeight: 44,
            borderRadius: 12,
            colorPrimary: '#765a24',
            activeBorderColor: '#765a24',
            hoverBorderColor: '#765a24',
          },
          DatePicker: {
            controlHeight: 40,
            borderRadius: 12,
            colorPrimary: '#765a24',
            activeBorderColor: '#765a24',
            hoverBorderColor: '#765a24',
          },
          Select: {
            controlHeight: 40,
            borderRadius: 12,
            colorPrimary: '#765a24',
          },
          Table: {
            headerBg: 'var(--color-surface-container, #eceef0)',
            headerColor: 'var(--color-on-surface, #191c1e)',
            headerBorderRadius: 12,
            borderColor: 'rgba(0, 0, 0, 0.06)',
            cellPaddingBlock: 16,
            cellPaddingInline: 24,
            rowHoverBg: 'rgba(0, 0, 0, 0.02)',
            rowSelectedBg: 'rgba(186, 26, 26, 0.06)',
            rowSelectedHoverBg: 'rgba(186, 26, 26, 0.1)',
          },
          Modal: {
            borderRadiusLG: 16,
          },
          Drawer: {
            borderRadiusLG: 24,
          },
          Segmented: {
            trackBg: 'var(--color-surface-container, #eceef0)',
            itemSelectedBg: '#ffffff',
            itemSelectedColor: '#765a24',
            borderRadius: 12,
          },
          Checkbox: {
            colorPrimary: '#dc2626', // checkbox เลือกลบ = แดง ตาม accent-red-600 เดิม
            colorPrimaryHover: '#b91c1c',
            borderRadiusSM: 4,
          },
          Tag: {
            borderRadiusSM: 8,
          },
          Pagination: {
            colorPrimary: '#765a24', // หน้าปัจจุบันสีทอง
            colorPrimaryHover: '#5c461c',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}

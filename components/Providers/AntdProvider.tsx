'use client'

import { ConfigProvider } from 'antd'
import thTH from 'antd/locale/th_TH'

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
          colorText: '#1a1c18', // on-surface
          colorBgContainer: '#ffffff',
          borderRadius: 12, // match rounded-xl
          wireframe: false,
          fontFamily: 'inherit', // will use Next.js fonts defined in layout
        },
        components: {
          Card: {
            colorBgContainer: 'var(--color-surface, #ffffff)',
            colorBorderSecondary: 'var(--color-outline-variant, #e1e3de)',
            borderRadiusLG: 16,
            boxShadowTertiary: '0px 2px 8px rgba(0,0,0,0.05)',
          },
          Button: {
            controlHeight: 40,
            controlHeightLG: 48,
            controlHeightSM: 32,
            borderRadius: 8,
          },
          Input: {
            controlHeight: 44,
            controlHeightLG: 48,
            borderRadius: 8,
            colorBorder: 'var(--color-outline-variant, #e1e3de)',
          },
          Table: {
            headerBg: 'var(--color-surface-container-low, #f2f4ef)',
            headerColor: 'var(--color-on-surface-variant, #43483e)',
            headerBorderRadius: 12,
            borderColor: 'rgba(0,0,0,0.06)',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}

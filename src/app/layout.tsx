export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { template: '%s', default: 'CMS' },
  description: '',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}

import Link from 'next/link'
import React from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface Props {
  items: BreadcrumbItem[]
  style?: React.CSSProperties
  dark?: boolean
}

export default function Breadcrumb({ items, style, dark = false }: Props) {
  const textColor = dark ? 'rgba(255,255,255,0.55)' : 'var(--color-text-secondary)'
  const currentColor = dark ? 'rgba(255,255,255,0.9)' : 'var(--color-text)'
  const hoverColor = dark ? 'rgba(255,255,255,0.9)' : 'var(--color-text)'

  return (
    <nav aria-label="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', ...style }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ fontSize: '0.8rem', color: textColor }}>/</span>}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                style={{ fontSize: '0.8rem', color: textColor, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = hoverColor }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = textColor }}
              >{item.label}</Link>
            ) : (
              <span style={{ fontSize: '0.8rem', color: isLast ? currentColor : textColor }}>{item.label}</span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

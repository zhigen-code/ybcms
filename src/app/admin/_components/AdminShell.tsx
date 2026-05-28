'use client'

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HomeIcon, FileTextIcon, FilesIcon, ImageIcon, BotIcon,
  PaletteIcon, SettingsIcon, ExternalLinkIcon, LinkIcon,
  MenuIcon, XIcon, UsersIcon, UserIcon, KeyIcon, LogOutIcon,
  FolderIcon, TagIcon, ClipboardIcon, LayersIcon,
} from '@/components/icons'
import { color, fontSize, radius, shadow, transition } from '@/app/admin/_lib/design'
import type { CustomTypeNavItem } from '@/app/admin/layout'

const StorageCtx = createContext(true)
export function useStorageReady() { return useContext(StorageCtx) }

type NavItem  = { href: string; label: string; icon: React.FC<{ size?: number }>; exact?: boolean }
type NavGroup = { group: string; items: NavItem[] }
type NavEntry = NavItem | NavGroup

function makeMonogramIcon(icon: string): React.FC<{ size?: number }> {
  const char = icon.replace(/[️‍]/g, '').slice(0, 1)
  return function MonogramIcon({ size = 16 }) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, fontSize: Math.round(size * 0.85) + 'px',
        fontWeight: 700, lineHeight: 1, flexShrink: 0,
      }}>{char}</span>
    )
  }
}

const NAV: NavEntry[] = [
  { href: '/admin', label: '概览', icon: HomeIcon, exact: true },
  { href: '/admin/ai', label: 'AI 运营', icon: BotIcon },
  {
    group: '内容',
    items: [
      { href: '/admin/post',          label: '文章',   icon: FileTextIcon },
      { href: '/admin/page',          label: '页面',   icon: FilesIcon },
      { href: '/admin/content-types', label: '内容类型', icon: LayersIcon },
    ],
  },
  {
    group: '管理',
    items: [
      { href: '/admin/categories', label: '分类',     icon: FolderIcon },
      { href: '/admin/tags',       label: '标签',     icon: TagIcon },
      { href: '/admin/links',      label: '友情链接', icon: LinkIcon },
      { href: '/admin/media',      label: '媒体',     icon: ImageIcon },
      { href: '/admin/forms',      label: '表单',     icon: ClipboardIcon },
    ],
  },
  {
    group: '系统',
    items: [
      { href: '/admin/users',      label: '用户', icon: UsersIcon },
      { href: '/admin/appearance', label: '外观', icon: PaletteIcon },
      { href: '/admin/settings',   label: '设置', icon: SettingsIcon },
    ],
  },
]

const SIDEBAR_W = 232

interface Me { id: string; name: string; email: string; role: string }

function UserMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [me,      setMe]      = useState<Me | null>(null)
  const [open,    setOpen]    = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, bottom: 0, right: 0, width: 0 })
  const btnRef  = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then((d: unknown) => {
      setMe(d as Me)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node) || dropRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const toggleOpen = useCallback(() => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.top, left: r.left, bottom: r.bottom, right: window.innerWidth - r.right, width: r.width })
    }
    setOpen(o => !o)
  }, [open])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  if (!me) return null

  const initials = (me.name || me.email || '?').slice(0, 1).toUpperCase()

  const MENU_ITEMS = [
    { icon: UserIcon, label: '修改资料', href: '/admin/account?tab=profile'  },
    { icon: KeyIcon,  label: '修改密码', href: '/admin/account?tab=password' },
    { icon: KeyIcon,  label: 'API 管理', href: '/admin/account?tab=apikeys'  },
  ]

  const dropdownStyle: React.CSSProperties = compact ? {
    position: 'fixed',
    top: dropPos.bottom + 6,
    right: dropPos.right,
    width: 180,
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.xl,
    boxShadow: shadow.lg,
    padding: '4px',
    zIndex: 9999,
  } : {
    position: 'fixed',
    left: dropPos.left,
    top: dropPos.top - 8,
    width: dropPos.width,
    transform: 'translateY(-100%)',
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.xl,
    boxShadow: shadow.lg,
    padding: '4px',
    zIndex: 9999,
  }

  const dropdownEl = open ? createPortal(
    <div ref={dropRef} style={dropdownStyle}>
      {MENU_ITEMS.map(({ icon: Icon, label, href }) => (
        <a key={label} href={href} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', borderRadius: radius.md, border: 'none',
          background: 'none', cursor: 'pointer', fontSize: fontSize.base,
          color: color.textSecondary, textDecoration: 'none',
          transition: `background ${transition.fast}`,
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = color.muted)}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}
        >
          <Icon size={13} />{label}
        </a>
      ))}
      <div style={{ height: '1px', background: color.borderSubtle, margin: '3px 4px' }} />
      <button onClick={logout} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 10px', borderRadius: radius.md, border: 'none',
        background: 'none', cursor: 'pointer', fontSize: fontSize.base,
        color: color.danger, fontFamily: 'inherit',
        transition: `background ${transition.fast}`,
      }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = color.dangerBg)}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}
      >
        <LogOutIcon size={13} />退出登录
      </button>
    </div>,
    document.body
  ) : null

  if (compact) {
    return (
      <>
        <button ref={btnRef} onClick={toggleOpen} style={{
          width: '32px', height: '32px', borderRadius: radius.lg,
          background: open ? color.brand : color.muted,
          border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#fff' : color.brand,
          fontSize: fontSize.sm, fontWeight: 700,
          transition: `background ${transition.fast}, color ${transition.fast}`,
          fontFamily: 'inherit',
        }}
          onMouseEnter={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = color.brand; (e.currentTarget as HTMLElement).style.color = '#fff' } }}
          onMouseLeave={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = color.muted; (e.currentTarget as HTMLElement).style.color = color.brand } }}
        >
          {initials}
        </button>
        {dropdownEl}
      </>
    )
  }

  return (
    <>
      <button ref={btnRef} onClick={toggleOpen} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
        padding: '7px 8px', borderRadius: radius.lg, border: 'none',
        background: open ? color.muted : 'transparent',
        cursor: 'pointer', textAlign: 'left',
        transition: `background ${transition.fast}`,
        fontFamily: 'inherit',
      }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = color.surfaceHover }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <div style={{
          width: '28px', height: '28px', borderRadius: radius.lg,
          background: color.brand, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: fontSize.sm, fontWeight: 700, flexShrink: 0,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fontSize.base, fontWeight: 500, color: color.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me.name || me.email}
          </div>
          <div style={{ fontSize: fontSize.xs, color: color.textMuted, marginTop: '1px' }}>
            {me.role === 'admin' ? '管理员' : me.role === 'editor' ? '编辑' : '作者'}
          </div>
        </div>
      </button>
      {dropdownEl}
    </>
  )
}

export default function AdminShell({ children, customTypes = [], storageReady = true, storageWarning = '' }: {
  children: React.ReactNode
  customTypes?: CustomTypeNavItem[]
  storageReady?: boolean
  storageWarning?: string
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Inject custom content types into the "内容" group
  const fullNav: NavEntry[] = NAV.map(entry => {
    if ('group' in entry && entry.group === '内容' && customTypes.length > 0) {
      return {
        ...entry,
        items: [
          ...entry.items,
          ...customTypes.map(ct => ({
            href: `/admin/${ct.slug}`,
            label: ct.name,
            icon: makeMonogramIcon(ct.icon),
          })),
        ],
      }
    }
    return entry
  })

  useEffect(() => { setOpen(false) }, [pathname])

  if (pathname === '/admin/login') return <>{children}</>

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '6px 8px', borderRadius: radius.md, marginBottom: '1px',
    textDecoration: 'none', fontSize: fontSize.base,
    fontWeight: active ? 500 : 400,
    color: active ? color.sidebar.textActive : color.sidebar.text,
    background: active ? color.sidebar.bgActive : 'transparent',
    boxShadow: active ? `inset 3px 0 0 ${color.brand}` : 'none',
    transition: `background ${transition.fast}, color ${transition.fast}`,
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: color.pageBg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media (min-width: 960px) {
          .adm-sidebar { transform: translateX(0) !important; position: sticky !important; height: 100vh !important; }
          .adm-overlay { display: none !important; }
          .adm-topbar  { display: none !important; }
        }
        @media (max-width: 959px) {
          .adm-sidebar { position: fixed !important; z-index: 50; height: 100vh !important; box-shadow: 4px 0 32px rgba(0,0,0,0.25); }
        }
        .adm-nav-item:hover { background: ${color.sidebar.bgHover} !important; color: ${color.sidebar.textActive} !important; }
      `}</style>

      {open && (
        <div className="adm-overlay" onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />
      )}

      <aside className="adm-sidebar" style={{
        width: SIDEBAR_W, flexShrink: 0,
        background: color.sidebar.bg,
        borderRight: `1px solid ${color.sidebar.border}`,
        display: 'flex', flexDirection: 'column',
        top: 0,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: `transform ${transition.slow}`,
      }}>
        {/* Brand */}
        <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${color.sidebar.border}` }}>
          <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: radius.md,
              background: color.brand, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', flexShrink: 0,
            }}>
              <BotIcon size={14} />
            </div>
            <span style={{ fontSize: fontSize.md, fontWeight: 700, color: color.sidebar.textActive, letterSpacing: '-0.02em' }}>
              AI CMS
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 8px 8px', overflowY: 'auto' }}>
          {fullNav.map((entry, idx) => {
            if ('group' in entry) {
              return (
                <div key={entry.group} style={{ marginTop: idx === 0 ? '2px' : '10px' }}>
                  {/* Section label — not a button, purely visual */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '0 8px', marginBottom: '3px',
                  }}>
                    <span style={{
                      fontSize: fontSize.xs, fontWeight: 600, letterSpacing: '0.05em',
                      textTransform: 'uppercase', color: color.textMuted, whiteSpace: 'nowrap',
                    }}>{entry.group}</span>
                    <div style={{ flex: 1, height: '1px', background: color.borderSubtle }} />
                  </div>
                  {entry.items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/')
                    return (
                      <Link key={href} href={href} className={active ? '' : 'adm-nav-item'} style={navItemStyle(active)}>
                        <span style={{ lineHeight: 0, flexShrink: 0, color: active ? color.sidebar.iconActive : color.sidebar.iconInactive }}>
                          <Icon size={16} />
                        </span>
                        {label}
                      </Link>
                    )
                  })}
                </div>
              )
            }

            const { href, label, icon: Icon, exact } = entry
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} className={active ? '' : 'adm-nav-item'} style={navItemStyle(active)}>
                <span style={{ lineHeight: 0, flexShrink: 0, color: active ? color.sidebar.iconActive : color.sidebar.iconInactive }}>
                  <Icon size={16} />
                </span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '8px', borderTop: `1px solid ${color.sidebar.border}` }}>
          <Link href="/" target="_blank" style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            fontSize: fontSize.sm, color: color.textMuted, textDecoration: 'none',
            padding: '6px 8px', borderRadius: radius.md, marginBottom: '4px',
            transition: `color ${transition.fast}, background ${transition.fast}`,
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = color.textSecondary; el.style.background = color.surfaceHover }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = color.textMuted;    el.style.background = 'transparent' }}
          >
            <ExternalLinkIcon size={13} />
            查看网站
          </Link>
          <UserMenu />
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="adm-topbar" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '0 16px', height: '48px',
          background: color.surface,
          borderBottom: `1px solid ${color.sidebar.border}`,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => setOpen(o => !o)} style={{
            padding: '6px', border: 'none', background: 'none',
            cursor: 'pointer', color: color.textSecondary, lineHeight: 0,
            borderRadius: radius.md, fontFamily: 'inherit',
          }}>
            {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
          </button>
          <span style={{ fontSize: fontSize.base, fontWeight: 600, color: color.textPrimary }}>AI CMS</span>
          <div style={{ marginLeft: 'auto' }}>
            <UserMenu compact />
          </div>
        </header>

        {!storageReady && (
          <div style={{
            background: '#fef3c7', borderBottom: '1px solid #fde68a',
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '15px' }}>⚠️</span>
            <span style={{ fontSize: '13px', color: '#92400e', flex: 1 }}>
              <strong>存储未配置：</strong>{storageWarning}。上传功能已禁用。
            </span>
            <Link href="/admin/settings" style={{
              fontSize: '12px', fontWeight: 600, color: '#92400e',
              border: '1px solid #f59e0b', borderRadius: '6px',
              padding: '3px 10px', textDecoration: 'none', whiteSpace: 'nowrap',
              background: '#fffbeb',
            }}>去配置 →</Link>
          </div>
        )}
        <main style={{ flex: 1 }}>
          <StorageCtx.Provider value={storageReady}>
            {children}
          </StorageCtx.Provider>
        </main>
      </div>
    </div>
  )
}

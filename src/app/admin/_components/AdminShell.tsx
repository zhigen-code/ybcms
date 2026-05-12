'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  HomeIcon, FileTextIcon, FilesIcon, ImageIcon, BotIcon,
  PaletteIcon, PuzzleIcon, SettingsIcon, ExternalLinkIcon,
  MenuIcon, XIcon, UsersIcon, UserIcon, KeyIcon, LogOutIcon,
  FolderIcon, TagIcon,
} from '@/components/icons'

const NAV = [
  { href: '/admin', label: '概览', icon: HomeIcon, exact: true },
  { href: '/admin/post', label: '文章', icon: FileTextIcon },
  { href: '/admin/page', label: '页面', icon: FilesIcon },
  { href: '/admin/categories', label: '分类', icon: FolderIcon },
  { href: '/admin/tags', label: '标签', icon: TagIcon },
  { href: '/admin/media', label: '媒体', icon: ImageIcon },
  { href: '/admin/ai', label: 'AI 运营', icon: BotIcon },
  { href: '/admin/appearance', label: '外观', icon: PaletteIcon },
  { href: '/admin/plugins', label: '插件', icon: PuzzleIcon },
  { href: '/admin/users', label: '用户', icon: UsersIcon },
  { href: '/admin/settings', label: '设置', icon: SettingsIcon },
]

const s = {
  sidebar: {
    width: 200,
    bg: '#fff',
    border: '#e8e8e8',
    text: '#52525b',
    textActive: '#18181b',
    bgActive: '#f4f4f5',
    brand: '#18181b',
  },
  main: { bg: '#f9fafb' },
}

interface Me { id: string; name: string; email: string; role: string }

function UserMenu() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const [modal, setModal] = useState<'profile' | 'password' | null>(null)
  const [profileName, setProfileName] = useState('')
  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then((d: unknown) => {
      const data = d as Me; setMe(data); setProfileName(data.name ?? '')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (
        btnRef.current?.contains(e.target as Node) ||
        dropRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const toggleOpen = useCallback(() => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.top, left: r.left, width: r.width })
    }
    setOpen(o => !o)
  }, [open])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  async function saveProfile() {
    setSaving(true); setMsg('')
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profileName }),
    })
    setSaving(false)
    if (res.ok) { setMe(m => m ? { ...m, name: profileName } : m); setModal(null) }
    else { const d = await res.json() as { error?: string }; setMsg(d.error ?? '保存失败') }
  }

  async function savePassword() {
    setSaving(true); setMsg('')
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
    })
    setSaving(false)
    if (res.ok) { setCurPwd(''); setNewPwd(''); setModal(null) }
    else { const d = await res.json() as { error?: string }; setMsg(d.error ?? '修改失败') }
  }

  function openModal(m: 'profile' | 'password') {
    setMsg(''); setOpen(false); setModal(m)
  }

  if (!me) return null

  const initials = (me.name || me.email || '?').slice(0, 1).toUpperCase()

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: '13px',
    border: '1px solid #e4e4e7', borderRadius: '7px',
    outline: 'none', boxSizing: 'border-box', color: '#18181b',
  }

  const dropdownEl = open ? createPortal(
    <div ref={dropRef} style={{
      position: 'fixed',
      left: dropPos.left,
      top: dropPos.top - 8,
      width: dropPos.width,
      transform: 'translateY(-100%)',
      background: '#fff', border: '1px solid #e8e8e8',
      borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      padding: '4px', zIndex: 9999,
    }}>
      {[
        { icon: UserIcon, label: '修改资料', action: () => openModal('profile') },
        { icon: KeyIcon, label: '修改密码', action: () => openModal('password') },
      ].map(({ icon: Icon, label, action }) => (
        <button key={label} onClick={action} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', borderRadius: '6px', border: 'none',
          background: 'none', cursor: 'pointer', fontSize: '13px', color: '#374151',
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f4f4f5')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}
        >
          <Icon size={13} />{label}
        </button>
      ))}
      <div style={{ height: '1px', background: '#f0f0f0', margin: '3px 4px' }} />
      <button onClick={logout} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 10px', borderRadius: '6px', border: 'none',
        background: 'none', cursor: 'pointer', fontSize: '13px', color: '#dc2626',
      }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#fef2f2')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}
      >
        <LogOutIcon size={13} />退出登录
      </button>
    </div>,
    document.body
  ) : null

  const modalEl = modal ? createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
      <div style={{
        background: '#fff', borderRadius: '14px', padding: '24px',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181b', margin: '0 0 18px' }}>
          {modal === 'profile' ? '修改资料' : '修改密码'}
        </h2>

        {modal === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>显示名称</label>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} style={inputStyle} placeholder="你的名字" />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>邮箱</label>
              <input value={me.email} disabled style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af' }} />
            </div>
          </div>
        )}

        {modal === 'password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>当前密码</label>
              <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} style={inputStyle} placeholder="输入当前密码" />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>新密码</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={inputStyle} placeholder="至少 6 位" />
            </div>
          </div>
        )}

        {msg && (
          <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '10px' }}>{msg}</p>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={() => setModal(null)} style={{
            padding: '7px 16px', borderRadius: '7px', border: '1px solid #e4e4e7',
            background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#374151',
          }}>取消</button>
          <button
            onClick={modal === 'profile' ? saveProfile : savePassword}
            disabled={saving}
            style={{
              padding: '7px 16px', borderRadius: '7px', border: 'none',
              background: '#18181b', color: '#fff', fontSize: '13px',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            }}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button ref={btnRef} onClick={toggleOpen} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 10px', borderRadius: '8px', border: 'none',
        background: open ? '#f4f4f5' : 'transparent',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s',
      }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = '#f9f9f9' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = open ? '#f4f4f5' : 'transparent' }}
      >
        <div style={{
          width: '26px', height: '26px', borderRadius: '50%',
          background: '#18181b', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, flexShrink: 0,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me.name || me.email}
          </div>
          <div style={{ fontSize: '10px', color: '#a1a1aa' }}>
            {me.role === 'admin' ? '管理员' : me.role === 'editor' ? '编辑' : '作者'}
          </div>
        </div>
      </button>
      {dropdownEl}
      {modalEl}
    </>
  )
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: s.main.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media (min-width: 960px) {
          .adm-sidebar { transform: translateX(0) !important; position: sticky !important; height: 100vh !important; }
          .adm-overlay { display: none !important; }
          .adm-topbar { display: none !important; }
        }
        @media (max-width: 959px) {
          .adm-sidebar { position: fixed !important; z-index: 50; height: 100vh !important; box-shadow: 4px 0 24px rgba(0,0,0,0.08); }
        }
        .adm-nav-item:hover { background: ${s.sidebar.bgActive} !important; color: ${s.sidebar.textActive} !important; }
      `}</style>

      {/* Overlay */}
      {open && (
        <div className="adm-overlay" onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 40, backdropFilter: 'blur(1px)' }} />
      )}

      {/* Sidebar */}
      <aside className="adm-sidebar" style={{
        width: s.sidebar.width, flexShrink: 0,
        background: s.sidebar.bg,
        borderRight: `1px solid ${s.sidebar.border}`,
        display: 'flex', flexDirection: 'column',
        top: 0,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${s.sidebar.border}` }}>
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: s.sidebar.brand, letterSpacing: '-0.01em' }}>
              AI CMS
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} className={active ? '' : 'adm-nav-item'} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 8px', borderRadius: '6px', marginBottom: '1px',
                textDecoration: 'none', fontSize: '13.5px',
                fontWeight: active ? 500 : 400,
                color: active ? s.sidebar.textActive : s.sidebar.text,
                background: active ? s.sidebar.bgActive : 'transparent',
                transition: 'background 0.1s, color 0.1s',
              }}>
                <span style={{ opacity: active ? 1 : 0.6, lineHeight: 0 }}><Icon size={15} /></span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '8px 8px 10px', borderTop: `1px solid ${s.sidebar.border}` }}>
          <div style={{ marginBottom: '6px', padding: '0 2px' }}>
            <Link href="/" target="_blank" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', color: '#a1a1aa', textDecoration: 'none',
              padding: '5px 8px', borderRadius: '6px',
              transition: 'color 0.1s',
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#52525b')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#a1a1aa')}
            >
              <ExternalLinkIcon size={12} />
              查看网站
            </Link>
          </div>
          <UserMenu />
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar */}
        <header className="adm-topbar" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '0 16px', height: '48px',
          background: '#fff', borderBottom: `1px solid ${s.sidebar.border}`,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => setOpen(o => !o)} style={{
            padding: '6px', border: 'none', background: 'none',
            cursor: 'pointer', color: '#52525b', lineHeight: 0, borderRadius: '6px',
          }}>
            {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
          </button>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181b' }}>AI CMS</span>
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}

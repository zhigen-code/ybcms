'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Link } from '@/types'
import { ExternalLinkIcon, PlusIcon, EditIcon, TrashIcon, GlobeIcon } from '@/components/icons'

interface Props { initialLinks: Link[] }

const EMPTY: Omit<Link, 'id' | 'created_at'> = {
  name: '', url: '', description: null, logo: null, sort_order: 0, status: 'active',
}

function Modal({
  title, link, saving, error,
  onChange, onSave, onClose,
}: {
  title: string
  link: Omit<Link, 'id' | 'created_at'>
  saving: boolean
  error: string
  onChange: (k: keyof typeof EMPTY, v: unknown) => void
  onSave: () => void
  onClose: () => void
}) {
  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: '13px',
    border: '1px solid #e4e4e7', borderRadius: '7px',
    background: '#fff', color: '#18181b', outline: 'none', boxSizing: 'border-box',
  }
  const label: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 500, color: '#52525b', marginBottom: '4px',
  }
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#18181b', marginBottom: '1.25rem' }}>{title}</h2>

        {error && <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 10px', marginBottom: '1rem' }}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={label}>网站名称 <span style={{ color: '#dc2626' }}>*</span></label>
            <input style={inp} value={link.name} placeholder="例：阮一峰的网络日志" onChange={e => onChange('name', e.target.value)}
              onFocus={e => (e.target.style.borderColor = '#18181b')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
          </div>
          <div>
            <label style={label}>网站地址 <span style={{ color: '#dc2626' }}>*</span></label>
            <input style={inp} value={link.url} placeholder="https://example.com" onChange={e => onChange('url', e.target.value)}
              onFocus={e => (e.target.style.borderColor = '#18181b')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
          </div>
          <div>
            <label style={label}>Logo URL <span style={{ color: '#a1a1aa', fontWeight: 400 }}>（可选）</span></label>
            <input style={inp} value={link.logo ?? ''} placeholder="https://example.com/favicon.ico" onChange={e => onChange('logo', e.target.value || null)}
              onFocus={e => (e.target.style.borderColor = '#18181b')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
          </div>
          <div>
            <label style={label}>简介 <span style={{ color: '#a1a1aa', fontWeight: 400 }}>（可选）</span></label>
            <textarea style={{ ...inp, height: '72px', resize: 'vertical' }} value={link.description ?? ''} placeholder="一句话介绍这个网站" onChange={e => onChange('description', e.target.value || null)}
              onFocus={e => (e.target.style.borderColor = '#18181b')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>排序</label>
              <input style={inp} type="number" value={link.sort_order} onChange={e => onChange('sort_order', parseInt(e.target.value, 10) || 0)}
                onFocus={e => (e.target.style.borderColor = '#18181b')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
            </div>
            <div>
              <label style={label}>状态</label>
              <select style={inp} value={link.status} onChange={e => onChange('status', e.target.value)}>
                <option value="active">显示</option>
                <option value="hidden">隐藏</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.5rem' }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: '7px', border: '1px solid #e4e4e7', background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#52525b' }}>取消</button>
          <button onClick={onSave} disabled={saving} style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: '#18181b', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', color: '#fff', opacity: saving ? 0.6 : 1 }}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function LinksClient({ initialLinks }: Props) {
  const [links, setLinks] = useState<Link[]>(initialLinks)
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; id?: string } | null>(null)
  const [form, setForm] = useState<Omit<Link, 'id' | 'created_at'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openAdd() {
    setForm({ ...EMPTY, sort_order: links.length })
    setError('')
    setModal({ mode: 'add' })
  }

  function openEdit(link: Link) {
    setForm({ name: link.name, url: link.url, description: link.description, logo: link.logo, sort_order: link.sort_order, status: link.status })
    setError('')
    setModal({ mode: 'edit', id: link.id })
  }

  function closeModal() { setModal(null); setError('') }

  function change(k: keyof typeof EMPTY, v: unknown) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('名称不能为空'); return }
    if (!form.url.trim())  { setError('URL 不能为空'); return }
    setSaving(true); setError('')
    try {
      if (modal?.mode === 'add') {
        const res = await fetch('/api/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        if (!res.ok) { setError((await res.json() as { error: string }).error ?? '保存失败'); return }
        const { id } = await res.json() as { id: string }
        setLinks(prev => [...prev, { ...form, id, created_at: Date.now() / 1000 }])
      } else {
        const res = await fetch(`/api/links/${modal!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        if (!res.ok) { setError((await res.json() as { error: string }).error ?? '保存失败'); return }
        setLinks(prev => prev.map(l => l.id === modal!.id ? { ...l, ...form } : l))
      }
      closeModal()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定删除「${name}」？`)) return
    await fetch(`/api/links/${id}`, { method: 'DELETE' })
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  async function toggleStatus(link: Link) {
    const next = link.status === 'active' ? 'hidden' : 'active'
    await fetch(`/api/links/${link.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) })
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, status: next } : l))
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#18181b', marginBottom: '4px' }}>友情链接</h1>
          <p style={{ fontSize: '13px', color: '#71717a' }}>管理站点友情链接，在前台 <a href="/links" target="_blank" style={{ color: '#2563eb', textDecoration: 'none' }}>/links</a> 页面展示</p>
        </div>
        <button onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#18181b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <PlusIcon size={14} /> 添加链接
        </button>
      </div>

      {/* Empty state */}
      {links.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: '#a1a1aa' }}>
          <GlobeIcon size={32} />
          <p style={{ marginTop: '1rem', fontSize: '14px', color: '#52525b', fontWeight: 500 }}>还没有友情链接</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>点击「添加链接」开始添加</p>
        </div>
      )}

      {/* Grid */}
      {links.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {links.map(link => (
            <div key={link.id} style={{ border: '1px solid #e4e4e7', borderRadius: '10px', padding: '1rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Top row: logo + name + external link */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {link.logo
                  ? <img src={link.logo} alt={link.name} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, border: '1px solid #f4f4f5' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  : <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><GlobeIcon size={14} /></div>
                }
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.name}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: '#a1a1aa', lineHeight: 0, flexShrink: 0 }}>
                  <ExternalLinkIcon size={14} />
                </a>
              </div>

              {/* URL */}
              <p style={{ fontSize: '12px', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</p>

              {/* Description */}
              {link.description && (
                <p style={{ fontSize: '12px', color: '#52525b', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{link.description}</p>
              )}

              {/* Footer: status + actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #f4f4f5' }}>
                <button onClick={() => toggleStatus(link)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', border: '1px solid', cursor: 'pointer', background: 'none', fontWeight: 500,
                  color: link.status === 'active' ? '#16a34a' : '#71717a',
                  borderColor: link.status === 'active' ? '#bbf7d0' : '#e4e4e7',
                }}>
                  {link.status === 'active' ? '● 显示' : '○ 隐藏'}
                </button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => openEdit(link)} style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e4e4e7', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#52525b' }}>
                    <EditIcon size={13} />
                  </button>
                  <button onClick={() => handleDelete(link.id, link.name)} style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#dc2626' }}>
                    <TrashIcon size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'add' ? '添加友情链接' : '编辑友情链接'}
          link={form} saving={saving} error={error}
          onChange={change} onSave={handleSave} onClose={closeModal}
        />
      )}
    </div>
  )
}

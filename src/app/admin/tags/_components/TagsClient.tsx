'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { PlusIcon, EditIcon, TrashIcon } from '@/components/icons'
import type { Tag } from '@/types'

type TagWithCount = Tag & { count: number }

const inp: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: '13px',
  border: '1px solid #e4e4e7', borderRadius: '7px',
  outline: 'none', boxSizing: 'border-box', color: '#18181b',
}

export default function TagsClient({ initialTags }: { initialTags: TagWithCount[] }) {
  const [tags, setTags] = useState(initialTags)
  const [modal, setModal] = useState<{ type: 'create' } | { type: 'edit'; item: TagWithCount } | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')

  const filtered = tags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  function openCreate() { setName(''); setMsg(''); setModal({ type: 'create' }) }
  function openEdit(t: TagWithCount) { setName(t.name); setMsg(''); setModal({ type: 'edit', item: t }) }

  async function handleSave() {
    if (!name.trim()) { setMsg('名称不能为空'); return }
    setSaving(true); setMsg('')
    try {
      if (modal?.type === 'create') {
        const res = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) { setMsg('创建失败'); return }
        const tag = await res.json() as TagWithCount
        setTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      } else if (modal?.type === 'edit') {
        const res = await fetch(`/api/tags/${modal.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) { setMsg('保存失败'); return }
        setTags(prev => prev.map(t => t.id === modal.item.id ? { ...t, name } : t))
      }
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    setTags(prev => prev.filter(t => t.id !== id))
    setDelId(null)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#18181b', margin: 0 }}>标签管理</h1>
          <p style={{ fontSize: '13px', color: '#71717a', margin: '4px 0 0' }}>{tags.length} 个标签</p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          background: '#18181b', color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        }}>
          <PlusIcon size={14} />新建标签
        </button>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="搜索标签…" style={{ ...inp, marginBottom: '16px', maxWidth: '280px' }}
      />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#a1a1aa', border: '1px dashed #e4e4e7', borderRadius: '12px' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>{search ? '没有匹配的标签' : '还没有标签'}</p>
        </div>
      ) : (
        <div style={{ border: '1px solid #e4e4e7', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
          {filtered.map((tag, i) => (
            <div key={tag.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 16px',
              borderBottom: i < filtered.length - 1 ? '1px solid #f4f4f5' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#18181b' }}>{tag.name}</span>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>/{tag.slug}</span>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '99px',
                background: tag.count > 0 ? 'rgba(99,102,241,0.08)' : '#f4f4f5',
                color: tag.count > 0 ? '#6366f1' : '#a1a1aa',
                flexShrink: 0,
              }}>
                {tag.count} 篇
              </span>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => openEdit(tag)} style={{
                  padding: '5px 8px', border: '1px solid #e4e4e7', borderRadius: '6px',
                  background: '#fff', cursor: 'pointer', color: '#71717a', lineHeight: 0,
                }}>
                  <EditIcon size={13} />
                </button>
                <button onClick={() => setDelId(tag.id)} style={{
                  padding: '5px 8px', border: '1px solid #fecaca', borderRadius: '6px',
                  background: '#fff', cursor: 'pointer', color: '#ef4444', lineHeight: 0,
                }}>
                  <TrashIcon size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181b', margin: '0 0 16px' }}>
              {modal.type === 'create' ? '新建标签' : '编辑标签'}
            </h2>
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="标签名称"
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
            {msg && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>{msg}</p>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '18px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '7px 16px', borderRadius: '7px', border: '1px solid #e4e4e7', background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>取消</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: '#18181b', color: '#fff', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirm */}
      {delId && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setDelId(null) }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181b', margin: '0 0 8px' }}>删除标签</h2>
            <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 20px' }}>删除后文章的标签关联也会移除，不可恢复。</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDelId(null)} style={{ padding: '7px 16px', borderRadius: '7px', border: '1px solid #e4e4e7', background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>取消</button>
              <button onClick={() => handleDelete(delId)} style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>删除</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { PlusIcon, EditIcon, TrashIcon } from '@/components/icons'
import type { Category } from '@/types'

interface Props {
  initialPost: Category[]
  initialPage: Category[]
}

const inp: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: '13px',
  border: '1px solid #e4e4e7', borderRadius: '7px',
  outline: 'none', boxSizing: 'border-box', color: '#18181b',
}

type ModalMode = { type: 'create' } | { type: 'edit'; item: Category }

export default function CategoriesClient({ initialPost, initialPage }: Props) {
  const [tab, setTab] = useState<'post' | 'page'>('post')
  const [postCats, setPostCats] = useState(initialPost)
  const [pageCats, setPageCats] = useState(initialPage)
  const [modal, setModal] = useState<ModalMode | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const cats = tab === 'post' ? postCats : pageCats
  const setCats = tab === 'post' ? setPostCats : setPageCats

  function openCreate() {
    setName(''); setDescription(''); setParentId(''); setMsg('')
    setModal({ type: 'create' })
  }

  function openEdit(item: Category) {
    setName(item.name); setDescription(item.description ?? ''); setParentId(item.parent_id ?? ''); setMsg('')
    setModal({ type: 'edit', item })
  }

  async function handleSave() {
    if (!name.trim()) { setMsg('名称不能为空'); return }
    setSaving(true); setMsg('')
    try {
      if (modal?.type === 'create') {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, parent_id: parentId || null, content_type: tab }),
        })
        if (!res.ok) { setMsg('创建失败'); return }
        const cat = await res.json() as Category
        setCats(prev => [...prev, { ...cat, description: description || null, cover_image: null, created_at: Date.now() / 1000 }])
      } else if (modal?.type === 'edit') {
        const res = await fetch(`/api/categories/${modal.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, parent_id: parentId || null }),
        })
        if (!res.ok) { setMsg('保存失败'); return }
        setCats(prev => prev.map(c => c.id === modal.item.id ? { ...c, name, description: description || null, parent_id: parentId || null } : c))
      }
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    setCats(prev => prev.filter(c => c.id !== id))
    setDelId(null)
  }

  const parentName = (id: string) => cats.find(c => c.id === id)?.name ?? ''

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#18181b', margin: 0 }}>分类管理</h1>
          <p style={{ fontSize: '13px', color: '#71717a', margin: '4px 0 0' }}>{cats.length} 个分类</p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          background: '#18181b', color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        }}>
          <PlusIcon size={14} />新建分类
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#f4f4f5', borderRadius: '8px', padding: '3px', width: 'fit-content', marginBottom: '16px' }}>
        {([['post', '文章分类'], ['page', '页面分类']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '5px 14px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
            borderRadius: '6px', background: tab === k ? '#fff' : 'transparent',
            color: tab === k ? '#18181b' : '#71717a',
            boxShadow: tab === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      {cats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#a1a1aa', border: '1px dashed #e4e4e7', borderRadius: '12px' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>还没有分类</p>
          <p style={{ fontSize: '12px', marginTop: '6px' }}>点击「新建分类」开始</p>
        </div>
      ) : (
        <div style={{ border: '1px solid #e4e4e7', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
          {cats.map((cat, i) => (
            <div key={cat.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px',
              borderBottom: i < cats.length - 1 ? '1px solid #f4f4f5' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#18181b' }}>{cat.name}</span>
                  {cat.parent_id && (
                    <span style={{ fontSize: '11px', color: '#a1a1aa', background: '#f4f4f5', padding: '1px 6px', borderRadius: '4px' }}>
                      父级：{parentName(cat.parent_id)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
                  /{cat.slug}{cat.description ? ` · ${cat.description}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => openEdit(cat)} style={{
                  padding: '5px 8px', border: '1px solid #e4e4e7', borderRadius: '6px',
                  background: '#fff', cursor: 'pointer', color: '#71717a', lineHeight: 0,
                }}>
                  <EditIcon size={13} />
                </button>
                <button onClick={() => setDelId(cat.id)} style={{
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
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181b', margin: '0 0 18px' }}>
              {modal.type === 'create' ? '新建分类' : '编辑分类'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>名称 *</label>
                <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="分类名称" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>描述</label>
                <input value={description} onChange={e => setDescription(e.target.value)} style={inp} placeholder="可选" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>父级分类</label>
                <select value={parentId} onChange={e => setParentId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">无（顶级）</option>
                  {cats.filter(c => modal.type === 'edit' ? c.id !== modal.item.id : true).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {msg && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '10px' }}>{msg}</p>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
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
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181b', margin: '0 0 8px' }}>删除分类</h2>
            <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 20px' }}>删除后文章的分类关联也会移除，不可恢复。</p>
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

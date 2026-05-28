'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { PlusIcon, EditIcon, TrashIcon } from '@/components/icons'
import type { ContentType, CustomFieldDef } from '@/types'

const inp: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: '13px',
  border: '1px solid #e4e4e7', borderRadius: '7px',
  outline: 'none', boxSizing: 'border-box', color: '#18181b',
}
const chk: React.CSSProperties = { width: '15px', height: '15px', cursor: 'pointer' }
const badge = (on: boolean): React.CSSProperties => ({
  fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
  background: on ? 'rgba(99,102,241,0.1)' : '#f4f4f5',
  color: on ? '#6366f1' : '#a1a1aa',
})

const FIELD_TYPES: { value: CustomFieldDef['type']; label: string }[] = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'select', label: '下拉选择' },
  { value: 'multiselect', label: '多选' },
  { value: 'date', label: '日期' },
  { value: 'image', label: '图片' },
  { value: 'url', label: 'URL' },
]

type FormState = {
  name: string; icon: string
  has_timeline: boolean; has_author: boolean
  has_category: boolean; has_tag: boolean
  fields: CustomFieldDef[]
}

const defaultForm = (): FormState => ({
  name: '', icon: '📄',
  has_timeline: false, has_author: true,
  has_category: true, has_tag: true,
  fields: [],
})

function FieldRow({
  field, onChange, onDelete,
}: {
  field: CustomFieldDef
  onChange: (f: CustomFieldDef) => void
  onDelete: () => void
}) {
  const needsOptions = field.type === 'select' || field.type === 'multiselect'
  return (
    <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
            <input value={field.key} onChange={e => onChange({ ...field, key: e.target.value })}
              placeholder="字段键名 (英文)" style={inp} />
            <input value={field.label} onChange={e => onChange({ ...field, label: e.target.value })}
              placeholder="显示标签" style={inp} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={field.type} onChange={e => onChange({ ...field, type: e.target.value as CustomFieldDef['type'] })}
              style={{ ...inp, width: 'auto', flex: 1 }}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={!!field.required} onChange={e => onChange({ ...field, required: e.target.checked })} style={chk} />
              必填
            </label>
          </div>
          {needsOptions && (
            <input
              value={(field.options ?? []).join(',')}
              onChange={e => onChange({ ...field, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="选项（英文逗号分隔）" style={{ ...inp, marginTop: '6px' }} />
          )}
        </div>
        <button onClick={onDelete} style={{
          padding: '5px 8px', border: '1px solid #fecaca', borderRadius: '6px',
          background: '#fff', cursor: 'pointer', color: '#ef4444', lineHeight: 0, flexShrink: 0,
        }}>
          <TrashIcon size={13} />
        </button>
      </div>
    </div>
  )
}

export default function ContentTypesClient({ initialTypes }: { initialTypes: ContentType[] }) {
  const [types, setTypes] = useState(initialTypes)
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; item: ContentType } | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
  const [delError, setDelError] = useState('')
  const [form, setForm] = useState<FormState>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function openCreate() { setForm(defaultForm()); setMsg(''); setModal({ mode: 'create' }) }
  function openEdit(t: ContentType) {
    setForm({
      name: t.name, icon: t.icon || '📄',
      has_timeline: t.has_timeline, has_author: t.has_author,
      has_category: t.has_category, has_tag: t.has_tag,
      fields: t.fields ?? [],
    })
    setMsg('')
    setModal({ mode: 'edit', item: t })
  }

  function addField() {
    setForm(f => ({ ...f, fields: [...f.fields, { key: '', label: '', type: 'text' }] }))
  }

  function updateField(i: number, field: CustomFieldDef) {
    setForm(f => { const fields = [...f.fields]; fields[i] = field; return { ...f, fields } })
  }

  function removeField(i: number) {
    setForm(f => { const fields = [...f.fields]; fields.splice(i, 1); return { ...f, fields } })
  }

  async function handleSave() {
    if (!form.name.trim()) { setMsg('名称不能为空'); return }
    setSaving(true); setMsg('')
    try {
      if (modal?.mode === 'create') {
        const res = await fetch('/api/content-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) { setMsg('创建失败'); return }
        const ct = await res.json() as ContentType
        setTypes(prev => [...prev, { ...ct, has_timeline: form.has_timeline, has_author: form.has_author, has_category: form.has_category, has_tag: form.has_tag, has_comment: false, is_builtin: false, fields: form.fields, created_at: Date.now() }])
      } else if (modal?.mode === 'edit') {
        const res = await fetch(`/api/content-types/${modal.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) { setMsg('保存失败'); return }
        setTypes(prev => prev.map(t => t.id === modal.item.id ? { ...t, ...form } : t))
      }
      setModal(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDelError('')
    const res = await fetch(`/api/content-types/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      setDelError(body.error || '删除失败')
      return
    }
    setTypes(prev => prev.filter(t => t.id !== id))
    setDelId(null)
  }

  const custom = types.filter(t => !t.is_builtin)
  const builtin = types.filter(t => t.is_builtin)

  return (
    <div style={{ padding: '32px 40px 48px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#18181b', margin: 0 }}>内容类型</h1>
          <p style={{ fontSize: '13px', color: '#71717a', margin: '4px 0 0' }}>{types.length} 个类型（{custom.length} 个自定义）</p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          background: '#18181b', color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        }}>
          <PlusIcon size={14} />新建类型
        </button>
      </div>

      {builtin.length > 0 && (
        <>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#a1a1aa', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>内置</p>
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '12px', overflow: 'hidden', background: '#fafafa', marginBottom: '20px' }}>
            {builtin.map((t, i) => (
              <TypeRow key={t.id} t={t} isLast={i === builtin.length - 1}
                onEdit={() => {}} onDelete={() => {}} readonly />
            ))}
          </div>
        </>
      )}

      {custom.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#a1a1aa', border: '1px dashed #e4e4e7', borderRadius: '12px' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>还没有自定义内容类型</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#a1a1aa', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>自定义</p>
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
            {custom.map((t, i) => (
              <TypeRow key={t.id} t={t} isLast={i === custom.length - 1}
                onEdit={() => openEdit(t)} onDelete={() => setDelId(t.id)} />
            ))}
          </div>
        </>
      )}

      {modal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181b', margin: '0 0 18px' }}>
              {modal.mode === 'create' ? '新建内容类型' : '编辑内容类型'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>图标</label>
                <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={{ ...inp, textAlign: 'center', fontSize: '18px' }} maxLength={2} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '5px' }}>名称 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="内容类型名称" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {([
                ['has_author', '支持作者'],
                ['has_category', '支持分类'],
                ['has_tag', '支持标签'],
                ['has_timeline', '按时间线'],
              ] as [keyof FormState, string][]).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', padding: '8px 12px', border: '1px solid #e4e4e7', borderRadius: '7px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form[key] as boolean} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} style={chk} />
                  {label}
                </label>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181b' }}>自定义字段</span>
                <button onClick={addField} style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                  border: '1px solid #e4e4e7', borderRadius: '6px', background: '#fff',
                  fontSize: '12px', cursor: 'pointer', color: '#374151',
                }}>
                  <PlusIcon size={12} />添加字段
                </button>
              </div>
              {form.fields.length === 0 && (
                <p style={{ fontSize: '13px', color: '#a1a1aa', textAlign: 'center', padding: '20px 0' }}>暂无自定义字段</p>
              )}
              {form.fields.map((field, i) => (
                <FieldRow key={i} field={field}
                  onChange={f => updateField(i, f)}
                  onDelete={() => removeField(i)} />
              ))}
            </div>

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

      {delId && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) { setDelId(null); setDelError('') } }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#18181b', margin: '0 0 8px' }}>删除内容类型</h2>
            <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 20px' }}>删除后该类型下的所有内容将失去关联，此操作不可恢复。</p>
            {delError && <p style={{ fontSize: '12px', color: '#dc2626', margin: '-12px 0 16px', padding: '8px 10px', background: '#fef2f2', borderRadius: '6px' }}>{delError}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setDelId(null); setDelError('') }} style={{ padding: '7px 16px', borderRadius: '7px', border: '1px solid #e4e4e7', background: '#fff', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>取消</button>
              <button onClick={() => handleDelete(delId)} style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>删除</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function TypeRow({ t, isLast, onEdit, onDelete, readonly }: {
  t: ContentType; isLast: boolean
  onEdit: () => void; onDelete: () => void; readonly?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : '1px solid #f4f4f5',
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{t.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181b' }}>{t.name}</span>
          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>/{t.slug}</span>
          {t.is_builtin && <span style={{ fontSize: '11px', color: '#a1a1aa', background: '#f4f4f5', padding: '1px 6px', borderRadius: '4px' }}>内置</span>}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {t.has_author && <span style={badge(true)}>作者</span>}
          {t.has_category && <span style={badge(true)}>分类</span>}
          {t.has_tag && <span style={badge(true)}>标签</span>}
          {t.has_timeline && <span style={badge(true)}>时间线</span>}
          {(t.fields?.length ?? 0) > 0 && <span style={badge(true)}>{t.fields.length} 个自定义字段</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
        <Link href={`/admin/${t.slug}`} style={{
          padding: '5px 10px', border: '1px solid #e4e4e7', borderRadius: '6px',
          background: '#fff', fontSize: '12px', color: '#374151', textDecoration: 'none',
          fontWeight: 500, whiteSpace: 'nowrap',
        }}>
          管理内容 →
        </Link>
        {!readonly && (
          <>
            <button onClick={onEdit} style={{ padding: '5px 8px', border: '1px solid #e4e4e7', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#71717a', lineHeight: 0 }}>
              <EditIcon size={13} />
            </button>
            <button onClick={onDelete} style={{ padding: '5px 8px', border: '1px solid #fecaca', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#ef4444', lineHeight: 0 }}>
              <TrashIcon size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

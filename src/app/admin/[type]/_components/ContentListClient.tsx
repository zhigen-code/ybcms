'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Content, ContentStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import { SearchIcon, EditIcon, TrashIcon, EyeIcon } from '@/components/icons'
import PaginationNav from '@/components/PaginationNav'
import { color, fontSize, radius, transition, STATUS_MAP } from '@/app/admin/_lib/design'
import { Btn, BtnLink, StatusBadge, EmptyState, Thumbnail } from '@/app/admin/_components/Ui'

interface Pagination { page: number; totalPages: number; total: number; pageSize: number }

interface Props {
  initialItems: Content[]
  type: string
  typeName: string
  pagination: Pagination
}

const INPUT: React.CSSProperties = {
  padding: '8px 14px', fontSize: fontSize.base,
  border: `1px solid ${color.border}`, borderRadius: radius.lg,
  background: color.surface, color: color.textPrimary, outline: 'none',
  fontFamily: 'inherit',
}

const CONFIRM_BTN: React.CSSProperties = {
  padding: '3px 8px', fontSize: fontSize.xs, fontWeight: 600,
  border: 'none', borderRadius: radius.sm, cursor: 'pointer',
  fontFamily: 'inherit',
}

const ICON_BTN: React.CSSProperties = {
  padding: '6px', borderRadius: radius.md, background: 'none',
  border: 'none', cursor: 'pointer', lineHeight: 0,
  color: color.textTertiary, transition: `background ${transition.fast}, color ${transition.fast}`,
}

export default function ContentListClient({ initialItems, type, typeName, pagination }: Props) {
  const [items,   setItems]   = useState(initialItems)
  const [search,  setSearch]  = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null)
  const [confirmToggleId,  setConfirmToggleId]  = useState<string | null>(null)

  // Batch selection
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set())
  const [batchWorking,     setBatchWorking]     = useState(false)
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)

  const filtered = items.filter(item => {
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || item.status === statusFilter
    return matchSearch && matchStatus
  })

  const allSelected  = filtered.length > 0 && filtered.every(i => selectedIds.has(i.id))
  const someSelected = selectedIds.size > 0

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(i => i.id)))
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function doDelete(id: string) {
    setConfirmDeleteId(null)
    setDeleting(id)
    try {
      const res = await fetch(`/api/contents/${id}`, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.filter(i => i.id !== id))
    } finally { setDeleting(null) }
  }

  async function doToggleStatus(item: Content) {
    setConfirmToggleId(null)
    const newStatus = item.status === 'published' ? 'draft' : 'published'
    const res = await fetch(`/api/contents/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
  }

  async function batchSetStatus(status: ContentStatus) {
    setBatchWorking(true)
    try {
      await Promise.all([...selectedIds].map(id =>
        fetch(`/api/contents/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      ))
      setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, status } : i))
      setSelectedIds(new Set())
    } finally { setBatchWorking(false) }
  }

  async function batchDelete() {
    setBatchWorking(true)
    try {
      await Promise.all([...selectedIds].map(id => fetch(`/api/contents/${id}`, { method: 'DELETE' })))
      setItems(prev => prev.filter(i => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
    } finally { setBatchWorking(false); setConfirmBatchDelete(false) }
  }

  return (
    <div>
      <style>{`
        .cl-side { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        @media(max-width:640px) {
          .cl-row { flex-wrap: wrap !important; padding: 10px 14px !important; gap: 6px 8px !important; align-items: flex-start !important; }
          .cl-thumb { display: none !important; }
          .cl-select-hd { padding: 8px 14px !important; }
          .cl-side { width: 100%; margin-left: 23px; padding-top: 6px; border-top: 1px solid ${color.borderSubtle}; flex-wrap: wrap; gap: 6px !important; }
          .cl-preview-btn { display: none !important; }
        }
      `}</style>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      {someSelected ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem',
          padding: '10px 14px', borderRadius: radius.lg,
          background: color.brand, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: fontSize.base, color: '#fff', fontWeight: 500, flex: 1 }}>
            已选 {selectedIds.size} 条
          </span>

          {confirmBatchDelete ? (
            <>
              <span style={{ fontSize: fontSize.sm, color: '#fca5a5' }}>确认删除 {selectedIds.size} 条？</span>
              <button onClick={batchDelete} disabled={batchWorking}
                style={{ ...CONFIRM_BTN, background: '#ef4444', color: '#fff', opacity: batchWorking ? 0.6 : 1 }}>
                {batchWorking ? '删除中…' : '确认删除'}
              </button>
              <button onClick={() => setConfirmBatchDelete(false)}
                style={{ ...CONFIRM_BTN, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                取消
              </button>
            </>
          ) : (
            <>
              <button onClick={() => batchSetStatus('published')} disabled={batchWorking}
                style={{ ...CONFIRM_BTN, background: '#10b981', color: '#fff', opacity: batchWorking ? 0.6 : 1 }}>
                批量发布
              </button>
              <button onClick={() => batchSetStatus('draft')} disabled={batchWorking}
                style={{ ...CONFIRM_BTN, background: color.textTertiary, color: '#fff', opacity: batchWorking ? 0.6 : 1 }}>
                批量转草稿
              </button>
              <button onClick={() => setConfirmBatchDelete(true)} disabled={batchWorking}
                style={{ ...CONFIRM_BTN, background: 'transparent', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.5)' }}>
                批量删除
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                style={{ ...CONFIRM_BTN, background: 'transparent', color: color.textMuted, border: '1px solid rgba(255,255,255,0.2)' }}>
                取消选择
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '160px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: color.textTertiary, pointerEvents: 'none', lineHeight: 0 }}>
              <SearchIcon size={15} />
            </span>
            <input
              type="text" placeholder={`搜索${typeName}…`} value={search}
              onChange={e => { setSearch(e.target.value); setSelectedIds(new Set()) }}
              style={{ ...INPUT, paddingLeft: '36px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setSelectedIds(new Set()) }}
            style={{ ...INPUT, paddingRight: '2rem', cursor: 'pointer' }}
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── List ──────────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon size={20} />}
          title={search ? '没有找到匹配的内容' : `还没有${typeName}`}
          description={search ? '换个关键词试试' : `创建第一条${typeName}开始吧`}
          action={!search ? (
            <BtnLink href={`/admin/${type}/new`} variant="primary">
              新建{typeName}
            </BtnLink>
          ) : undefined}
        />
      ) : (
        <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.lg, overflow: 'hidden', background: color.surface }}>
          {/* Select-all header */}
          <div className="cl-select-hd" style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '8px 20px',
            borderBottom: `1px solid ${color.border}`,
            background: color.surfaceHover,
          }}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = !allSelected && someSelected }}
              onChange={toggleAll}
              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: color.brand, flexShrink: 0 }}
            />
            <span style={{ fontSize: fontSize.xs, color: color.textMuted, fontWeight: 500 }}>
              {someSelected ? `已选 ${selectedIds.size} / ${filtered.length}` : `共 ${filtered.length} 条`}
            </span>
          </div>

          {filtered.map((item, i) => {
            const isConfirmingDelete = confirmDeleteId === item.id
            const isConfirmingToggle = confirmToggleId === item.id
            const isSelected         = selectedIds.has(item.id)
            const previewHref        = item.type === 'post' ? `/post/${item.slug}` : `/${item.slug}`
            const editHref           = `/admin/${type}/${item.id}`
            const ts                 = item.published_at ?? item.created_at

            return (
              <div key={item.id} className="cl-row" style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 20px',
                borderBottom: i < filtered.length - 1 ? `1px solid ${color.borderSubtle}` : 'none',
                background: isSelected ? 'rgba(99,102,241,0.04)' : color.surface,
                transition: `background ${transition.fast}`,
              }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = color.surfaceHover }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(99,102,241,0.04)' : color.surface }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox" checked={isSelected} onChange={() => toggleOne(item.id)}
                  style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: color.brand, flexShrink: 0 }}
                />

                {/* Cover thumbnail — hidden on mobile */}
                <span className="cl-thumb" style={{ lineHeight: 0, flexShrink: 0 }}>
                  <Thumbnail src={item.cover_image} letter={item.title} size={38} />
                </span>

                {/* Title + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <Link href={editHref} style={{
                      fontSize: fontSize.base, fontWeight: 500, color: color.textPrimary,
                      textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.title || '（无标题）'}
                    </Link>
                    {item.ai_generated && (
                      <span style={{
                        fontSize: fontSize.xs, fontWeight: 600, padding: '1px 5px',
                        borderRadius: radius.xs, background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                        flexShrink: 0,
                      }}>AI</span>
                    )}
                  </div>
                  <p style={{ fontSize: fontSize.xs, color: color.textMuted, margin: 0 }}>
                    /{item.slug} · {ts ? formatDate(ts) : '—'}
                  </p>
                </div>

                {/* Status + Actions */}
                <div className="cl-side">
                  {/* Status badge / toggle confirm */}
                  {isConfirmingToggle ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: fontSize.xs, color: color.textSecondary, whiteSpace: 'nowrap' }}>
                        切换为{item.status === 'published' ? '草稿' : '发布'}?
                      </span>
                      <button onClick={() => doToggleStatus(item)}
                        style={{ ...CONFIRM_BTN, background: color.brand, color: '#fff' }}>确认</button>
                      <button onClick={() => setConfirmToggleId(null)}
                        style={{ ...CONFIRM_BTN, background: color.muted, color: color.textSecondary }}>取消</button>
                    </div>
                  ) : (
                    <StatusBadge status={item.status} onClick={() => setConfirmToggleId(item.id)} title="点击切换状态" />
                  )}

                  {/* Row actions / delete confirm */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {isConfirmingDelete ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: fontSize.xs, color: color.danger, whiteSpace: 'nowrap' }}>确认删除?</span>
                        <button onClick={() => doDelete(item.id)} disabled={deleting === item.id}
                          style={{ ...CONFIRM_BTN, background: color.danger, color: '#fff', opacity: deleting === item.id ? 0.5 : 1 }}>
                          删除
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          style={{ ...CONFIRM_BTN, background: color.muted, color: color.textSecondary }}>
                          取消
                        </button>
                      </div>
                    ) : (
                      <>
                        <Link href={previewHref} target="_blank" title="预览" className="cl-preview-btn"
                          style={{ ...ICON_BTN, display: 'block', textDecoration: 'none' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = color.muted; el.style.color = color.textPrimary }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = color.textTertiary }}
                        >
                          <EyeIcon size={15} />
                        </Link>
                        <Link href={editHref} title="编辑" style={{ ...ICON_BTN, display: 'block', textDecoration: 'none' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = color.muted; el.style.color = '#2563eb' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = color.textTertiary }}
                        >
                          <EditIcon size={15} />
                        </Link>
                        <button onClick={() => setConfirmDeleteId(item.id)} disabled={deleting === item.id} title="删除"
                          style={{ ...ICON_BTN, opacity: deleting === item.id ? 0.4 : 1 }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = color.dangerMuted; el.style.color = color.danger }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = color.textTertiary }}
                        >
                          <TrashIcon size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PaginationNav
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        pageSize={pagination.pageSize}
        buildHref={p => p === 1 ? `/admin/${type}` : `/admin/${type}?page=${p}`}
        compact
      />
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import type { Media } from '@/types'
import { UploadIcon, CopyIcon, ExternalLinkIcon, TrashIcon, XIcon } from '@/components/icons'

interface Props { initialItems: Media[]; storageReady?: boolean }

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const isImage = (mime: string) => mime.startsWith('image/')

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function MediaLibraryClient({ initialItems, storageReady = true }: Props) {
  const [items, setItems] = useState(initialItems)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // single-select detail panel
  const [selected, setSelected] = useState<Media | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // multi-select batch
  const [multiSelect, setMultiSelect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/media', { method: 'POST', body: form })
      if (res.ok) {
        const d = await res.json() as { id: string; filename: string; url: string }
        const newMedia: Media = {
          id: d.id, filename: d.filename, r2_key: '', url: d.url,
          mime_type: file.type, size: file.size, width: null, height: null,
          alt: null, ai_alt: null, uploaded_by: null, created_at: Math.floor(Date.now() / 1000),
        }
        setItems(prev => [newMedia, ...prev])
      }
    } finally { setUploading(false) }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(uploadFile)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function doDelete(item: Media) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/media/${item.id}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== item.id))
        setSelected(null)
        setConfirmDelete(false)
      }
    } finally { setDeleting(false) }
  }

  async function doBatchDelete() {
    setBatchDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => fetch(`/api/media/${id}`, { method: 'DELETE' })))
      setItems(prev => prev.filter(i => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
      setConfirmBatchDelete(false)
    } finally { setBatchDeleting(false) }
  }

  function toggleMultiSelect() {
    if (multiSelect) {
      setMultiSelect(false)
      setSelectedIds(new Set())
      setConfirmBatchDelete(false)
    } else {
      setMultiSelect(true)
      setSelected(null)
      setConfirmDelete(false)
    }
  }

  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
  }

  function clickItem(item: Media) {
    if (multiSelect) {
      toggleId(item.id)
    } else {
      setSelected(prev => prev?.id === item.id ? null : item)
      setConfirmDelete(false)
    }
  }

  const allSelected = items.length > 0 && selectedIds.size === items.length
  const someSelected = selectedIds.size > 0

  return (
    <div style={{ display: 'flex', gap: '1.25rem', height: '100%' }}>
      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Upload zone */}
        <div
          onDragOver={e => { if (!storageReady) return; e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={storageReady ? handleDrop : undefined}
          onClick={() => storageReady && inputRef.current?.click()}
          style={{
            border: `2px dashed ${!storageReady ? '#f87171' : dragOver ? '#2563eb' : '#e4e4e7'}`,
            borderRadius: '12px', padding: '2rem',
            textAlign: 'center', cursor: storageReady ? 'pointer' : 'not-allowed',
            background: !storageReady ? 'rgba(239,68,68,0.03)' : dragOver ? 'rgba(37,99,235,0.05)' : '#fff',
            transition: 'all 0.15s', marginBottom: '1.25rem',
          }}
        >
          <input ref={inputRef} type="file" multiple accept="image/*,video/mp4,.pdf" style={{ display: 'none' }}
            onChange={e => storageReady && handleFiles(e.target.files)} disabled={!storageReady} />
          <div style={{ color: !storageReady ? '#ef4444' : uploading ? '#2563eb' : '#71717a', marginBottom: '0.625rem', lineHeight: 0, display: 'inline-block' }}>
            <UploadIcon size={28} />
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#18181b', marginBottom: '0.25rem' }}>
            {!storageReady ? '上传已禁用' : uploading ? '上传中…' : '点击或拖拽文件到这里'}
          </p>
          <p style={{ fontSize: '0.75rem', color: !storageReady ? '#ef4444' : '#71717a' }}>
            {!storageReady ? '请先配置存储驱动后再上传文件' : '支持图片、视频、PDF，单文件最大 20MB'}
          </p>
        </div>

        {/* Toolbar row */}
        {items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: '#71717a' }}>{items.length} 个文件</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {multiSelect && (
                <button onClick={toggleAll} style={{
                  padding: '5px 12px', borderRadius: '7px',
                  border: '1px solid #e4e4e7', background: '#fff',
                  fontSize: '12px', color: '#374151', cursor: 'pointer',
                }}>
                  {allSelected ? '取消全选' : '全选'}
                </button>
              )}
              <button onClick={toggleMultiSelect} style={{
                padding: '5px 14px', borderRadius: '7px', border: 'none',
                background: multiSelect ? '#18181b' : '#f4f4f5',
                color: multiSelect ? '#fff' : '#374151',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              }}>
                {multiSelect ? '退出多选' : '多选'}
              </button>
            </div>
          </div>
        )}

        {/* Batch action bar */}
        {multiSelect && someSelected && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '10px', marginBottom: '1rem',
            background: '#18181b', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500, flex: 1 }}>
              已选 {selectedIds.size} 个文件
            </span>
            {confirmBatchDelete ? (
              <>
                <span style={{ fontSize: '12px', color: '#fca5a5' }}>确认删除？此操作不可撤销</span>
                <button onClick={doBatchDelete} disabled={batchDeleting} style={{
                  padding: '5px 14px', borderRadius: '6px', border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 600,
                  cursor: batchDeleting ? 'not-allowed' : 'pointer', opacity: batchDeleting ? 0.6 : 1,
                }}>{batchDeleting ? '删除中…' : '确认删除'}</button>
                <button onClick={() => setConfirmBatchDelete(false)} style={{
                  padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent', color: '#fff', fontSize: '12px', cursor: 'pointer',
                }}>取消</button>
              </>
            ) : (
              <button onClick={() => setConfirmBatchDelete(true)} style={{
                padding: '5px 14px', borderRadius: '6px',
                border: '1px solid rgba(239,68,68,0.5)',
                background: 'transparent', color: '#fca5a5', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer',
              }}>批量删除</button>
            )}
          </div>
        )}

        {/* Grid */}
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#71717a' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <UploadIcon size={22} />
            </div>
            <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>还没有媒体文件</p>
            <p style={{ fontSize: '0.875rem' }}>上传图片、视频或 PDF 文件</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
            {items.map(item => {
              const isChecked = selectedIds.has(item.id)
              const isSingleSelected = !multiSelect && selected?.id === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => clickItem(item)}
                  style={{
                    aspectRatio: '1', borderRadius: '10px', overflow: 'hidden',
                    cursor: 'pointer', position: 'relative',
                    border: `2px solid ${isChecked || isSingleSelected ? '#2563eb' : '#e4e4e7'}`,
                    transition: 'border-color 0.15s',
                    background: '#f4f4f5',
                  }}
                >
                  {isImage(item.mime_type) ? (
                    <img src={item.url} alt={item.alt || item.filename}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
                      <div style={{ color: '#71717a' }}>
                        {item.mime_type.includes('pdf') ? (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                        ) : (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#71717a', textAlign: 'center', wordBreak: 'break-all', lineHeight: 1.3 }}>
                        {item.filename.length > 20 ? item.filename.slice(0, 18) + '…' : item.filename}
                      </span>
                    </div>
                  )}

                  {/* Overlay: filename (single-select) or checkbox (multi-select) */}
                  {multiSelect ? (
                    <div style={{
                      position: 'absolute', top: '6px', left: '6px',
                      width: '18px', height: '18px', borderRadius: '4px',
                      border: `2px solid ${isChecked ? '#2563eb' : 'rgba(255,255,255,0.8)'}`,
                      background: isChecked ? '#2563eb' : 'rgba(0,0,0,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', transition: 'all 0.1s',
                    }}>
                      {isChecked && <CheckIcon />}
                    </div>
                  ) : (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.4)',
                      opacity: isSingleSelected ? 1 : 0,
                      transition: 'opacity 0.15s',
                      display: 'flex', alignItems: 'flex-end', padding: '0.5rem',
                    }}>
                      <p style={{ color: '#fff', fontSize: '0.65rem', lineHeight: 1.3, wordBreak: 'break-all' }}>
                        {item.filename}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail panel (single-select only) */}
      {!multiSelect && selected && (
        <aside style={{ width: '220px', flexShrink: 0 }}>
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '12px', overflow: 'hidden', position: 'sticky', top: '1rem', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #e4e4e7', background: '#f4f4f5' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#18181b' }}>文件详情</span>
              <button onClick={() => { setSelected(null); setConfirmDelete(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#71717a', lineHeight: 0 }}>
                <XIcon size={15} />
              </button>
            </div>

            <div style={{ padding: '0.875rem' }}>
              {isImage(selected.mime_type) ? (
                <img src={selected.url} alt={selected.filename}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f5', borderRadius: '8px', color: '#71717a' }}>
                  <ExternalLinkIcon size={32} />
                </div>
              )}

              <div style={{ marginTop: '0.875rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#18181b', wordBreak: 'break-all', marginBottom: '0.25rem', lineHeight: 1.4 }}>{selected.filename}</p>
                <p style={{ fontSize: '0.75rem', color: '#71717a' }}>{formatBytes(selected.size)}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => copyUrl(selected.url)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.5rem', borderRadius: '8px', border: 'none',
                  background: copied ? '#10b981' : '#2563eb',
                  color: '#fff', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}>
                  <CopyIcon size={13} />
                  {copied ? '已复制' : '复制链接'}
                </button>
                <a href={selected.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.5rem', borderRadius: '8px', border: '1px solid #e4e4e7',
                  color: '#71717a', fontSize: '0.8rem', textDecoration: 'none',
                }}>
                  <ExternalLinkIcon size={13} />
                  在新标签打开
                </a>

                {/* Delete with inline confirm */}
                {confirmDelete ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p style={{ fontSize: '11px', color: '#ef4444', margin: 0, textAlign: 'center' }}>删除后不可恢复</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setConfirmDelete(false)} style={{
                        flex: 1, padding: '5px', borderRadius: '6px',
                        border: '1px solid #e4e4e7', background: '#fff',
                        fontSize: '12px', cursor: 'pointer', color: '#374151',
                      }}>取消</button>
                      <button onClick={() => doDelete(selected)} disabled={deleting} style={{
                        flex: 1, padding: '5px', borderRadius: '6px', border: 'none',
                        background: '#ef4444', color: '#fff',
                        fontSize: '12px', cursor: deleting ? 'not-allowed' : 'pointer',
                        opacity: deleting ? 0.5 : 1,
                      }}>{deleting ? '…' : '确认'}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.5rem', borderRadius: '8px', border: 'none',
                    background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer',
                  }}>
                    <TrashIcon size={13} />
                    删除文件
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

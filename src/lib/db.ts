import type { Content, ContentType, Category, Tag, User, Media, ListResult, AITask, AITaskType, AITaskStatus, Form, FormSubmission, Link } from '@/types'

export function getDB(env: CloudflareEnv): D1Database {
  return env.DB
}

// ── 通用查询工具 ────────────────────────────────────────────

export async function paginate<T>(
  db: D1Database,
  sql: string,
  params: unknown[],
  countSql: string,
  countParams: unknown[],
  page: number,
  pageSize: number
): Promise<ListResult<T>> {
  const [rows, countRow] = await Promise.all([
    db.prepare(sql).bind(...params).all<T>(),
    db.prepare(countSql).bind(...countParams).first<{ total: number }>(),
  ])
  const total = countRow?.total ?? 0
  return {
    items: rows.results,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// ── 内容类型 ────────────────────────────────────────────────

export async function getContentTypes(db: D1Database): Promise<ContentType[]> {
  const rows = await db.prepare('SELECT * FROM content_types ORDER BY created_at').all<ContentType & { fields: string }>()
  return rows.results.map(parseContentType)
}

export async function getContentType(db: D1Database, id: string): Promise<ContentType | null> {
  const row = await db.prepare('SELECT * FROM content_types WHERE id = ?').bind(id).first<ContentType & { fields: string }>()
  return row ? parseContentType(row) : null
}

function parseContentType(row: ContentType & { fields: string }): ContentType {
  return {
    ...row,
    has_timeline: Boolean(row.has_timeline),
    has_author: Boolean(row.has_author),
    has_category: Boolean(row.has_category),
    has_tag: Boolean(row.has_tag),
    has_comment: Boolean(row.has_comment),
    is_builtin: Boolean(row.is_builtin),
    fields: JSON.parse(row.fields || '[]'),
  }
}

export async function createContentType(
  db: D1Database,
  data: {
    id: string; name: string; slug: string; icon?: string
    has_timeline?: boolean; has_author?: boolean; has_category?: boolean
    has_tag?: boolean; fields?: unknown[]
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO content_types (id, name, slug, icon, has_timeline, has_author, has_category, has_tag, is_builtin, fields)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).bind(
    data.id, data.name, data.slug, data.icon ?? '📄',
    data.has_timeline ? 1 : 0, data.has_author ? 1 : 0,
    data.has_category ? 1 : 0, data.has_tag ? 1 : 0,
    JSON.stringify(data.fields ?? [])
  ).run()
}

export async function updateContentType(
  db: D1Database,
  id: string,
  data: Partial<{ name: string; icon: string; has_timeline: boolean; has_author: boolean; has_category: boolean; has_tag: boolean; fields: unknown[] }>
): Promise<void> {
  const map: Record<string, unknown> = {}
  if (data.name !== undefined) map.name = data.name
  if (data.icon !== undefined) map.icon = data.icon
  if (data.has_timeline !== undefined) map.has_timeline = data.has_timeline ? 1 : 0
  if (data.has_author !== undefined) map.has_author = data.has_author ? 1 : 0
  if (data.has_category !== undefined) map.has_category = data.has_category ? 1 : 0
  if (data.has_tag !== undefined) map.has_tag = data.has_tag ? 1 : 0
  if (data.fields !== undefined) map.fields = JSON.stringify(data.fields)
  const fields = Object.keys(map).map(k => `${k} = ?`)
  if (!fields.length) return
  await db.prepare(`UPDATE content_types SET ${fields.join(', ')} WHERE id = ? AND is_builtin = 0`)
    .bind(...Object.values(map), id).run()
}

export async function deleteContentType(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM content_types WHERE id = ? AND is_builtin = 0').bind(id).run()
}

// ── 内容 ────────────────────────────────────────────────────

export async function getContents(
  db: D1Database,
  options: {
    type?: string
    status?: string
    categoryId?: string
    tagId?: string
    authorId?: string
    search?: string
    page?: number
    pageSize?: number
  } = {}
): Promise<ListResult<Content>> {
  const { type, status, categoryId, tagId, authorId, search, page = 1, pageSize = 20 } = options
  const offset = (page - 1) * pageSize
  const conditions: string[] = []
  const params: unknown[] = []

  if (type) { conditions.push('c.type = ?'); params.push(type) }
  if (status) { conditions.push('c.status = ?'); params.push(status) }
  if (categoryId) {
    conditions.push('EXISTS (SELECT 1 FROM content_categories cc WHERE cc.content_id = c.id AND cc.category_id = ?)')
    params.push(categoryId)
  }
  if (authorId) { conditions.push('c.author_id = ?'); params.push(authorId) }
  if (tagId) {
    conditions.push('EXISTS (SELECT 1 FROM content_tags ct WHERE ct.content_id = c.id AND ct.tag_id = ?)')
    params.push(tagId)
  }

  if (search) {
    const ftsResult = await db
      .prepare(`SELECT id FROM contents_fts WHERE contents_fts MATCH ? LIMIT 100`)
      .bind(search)
      .all<{ id: string }>()
    const ids = ftsResult.results.map(r => r.id)
    if (!ids.length) return { items: [], pagination: { page, pageSize, total: 0, totalPages: 0 } }
    const inClause = ids.map(() => '?').join(',')
    conditions.push(`c.id IN (${inClause})`)
    params.push(...ids)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return paginate<Content>(
    db,
    `SELECT c.* FROM contents c ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
    `SELECT COUNT(*) as total FROM contents c ${where}`,
    params,
    page,
    pageSize
  )
}

export async function getContent(db: D1Database, id: string): Promise<Content | null> {
  const row = await db.prepare('SELECT * FROM contents WHERE id = ?').bind(id).first<Content>()
  if (!row) return null
  return attachContentFields(db, parseContent(row))
}

export async function getContentBySlug(db: D1Database, type: string, slug: string): Promise<Content | null> {
  const row = await db.prepare('SELECT * FROM contents WHERE type = ? AND slug = ?').bind(type, slug).first<Content>()
  if (!row) return null
  return attachContentFields(db, parseContent(row))
}

function parseContent(row: Content): Content {
  return {
    ...row,
    ai_generated: Boolean(row.ai_generated),
    ai_reviewed: Boolean(row.ai_reviewed),
  }
}

async function attachContentFields(db: D1Database, content: Content): Promise<Content> {
  const rows = await db.prepare('SELECT field_key, field_value FROM content_fields WHERE content_id = ?')
    .bind(content.id).all<{ field_key: string; field_value: string }>()
  if (!rows.results.length) return content
  const fields: Record<string, unknown> = {}
  for (const r of rows.results) {
    try { fields[r.field_key] = JSON.parse(r.field_value) } catch { fields[r.field_key] = r.field_value }
  }
  return { ...content, fields }
}

export async function saveContentFields(db: D1Database, contentId: string, fields: Record<string, unknown>): Promise<void> {
  const entries = Object.entries(fields)
  if (!entries.length) return
  for (const [key, value] of entries) {
    const serialized = JSON.stringify(value)
    await db.prepare(
      'INSERT INTO content_fields (id, content_id, field_key, field_value) VALUES (?, ?, ?, ?) ON CONFLICT(content_id, field_key) DO UPDATE SET field_value = excluded.field_value'
    ).bind(`${contentId}_${key}`, contentId, key, serialized).run()
  }
}

export async function createContent(db: D1Database, data: Omit<Content, 'created_at' | 'updated_at'>): Promise<void> {
  await db.prepare(`
    INSERT INTO contents (id, type, title, slug, content, excerpt, status, author_id,
      cover_image, published_at, scheduled_at, meta_title, meta_description, og_image,
      ai_generated, ai_reviewed, parent_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.id, data.type, data.title, data.slug, data.content, data.excerpt,
    data.status, data.author_id, data.cover_image,
    data.published_at, data.scheduled_at, data.meta_title, data.meta_description,
    data.og_image, data.ai_generated ? 1 : 0, data.ai_reviewed ? 1 : 0,
    data.parent_id ?? null, data.sort_order ?? 0
  ).run()
  await db.prepare(`INSERT INTO contents_fts(id, title, excerpt, content) VALUES (?, ?, ?, ?)`)
    .bind(data.id, data.title, data.excerpt ?? '', data.content ?? '').run()
}

const CONTENT_EXCLUDED_KEYS = new Set(['id', 'category_id', 'author', 'categories', 'tags', 'fields', 'parent'])

export async function updateContent(db: D1Database, id: string, data: Partial<Content>): Promise<void> {
  const fields = Object.entries(data)
    .filter(([k]) => !CONTENT_EXCLUDED_KEYS.has(k))
    .map(([k]) => `${k} = ?`)
  const values = Object.entries(data)
    .filter(([k]) => !CONTENT_EXCLUDED_KEYS.has(k))
    .map(([, v]) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))

  await db.prepare(
    `UPDATE contents SET ${fields.join(', ')}, updated_at = unixepoch() WHERE id = ?`
  ).bind(...values, id).run()

  // 同步 FTS 索引
  if (data.title !== undefined || data.excerpt !== undefined || data.content !== undefined) {
    const row = await db.prepare('SELECT title, excerpt, content FROM contents WHERE id = ?')
      .bind(id).first<{ title: string; excerpt: string | null; content: string | null }>()
    if (row) {
      await db.prepare(`DELETE FROM contents_fts WHERE id = ?`).bind(id).run()
      await db.prepare(`INSERT INTO contents_fts(id, title, excerpt, content) VALUES (?, ?, ?, ?)`)
        .bind(id, row.title, row.excerpt ?? '', row.content ?? '').run()
    }
  }
}

export async function deleteContent(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM contents WHERE id = ?').bind(id).run()
  await db.prepare('DELETE FROM contents_fts WHERE id = ?').bind(id).run()
}

// ── 分类 ────────────────────────────────────────────────────

export async function getCategories(db: D1Database, contentType: string): Promise<Category[]> {
  const rows = await db.prepare('SELECT * FROM categories WHERE content_type = ? ORDER BY sort_order ASC, name ASC').bind(contentType).all<Category>()
  return rows.results
}

export type CategoryWithCount = Category & { count: number }

export async function getCategoriesWithCount(db: D1Database, contentType: string): Promise<CategoryWithCount[]> {
  const rows = await db.prepare(`
    SELECT c.*, COUNT(DISTINCT cc.content_id) as count
    FROM categories c
    LEFT JOIN content_categories cc ON cc.category_id = c.id
    LEFT JOIN contents cnt ON cnt.id = cc.content_id AND cnt.status = 'published'
    WHERE c.content_type = ?
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
  `).bind(contentType).all<CategoryWithCount>()
  return rows.results
}

export async function createCategory(db: D1Database, data: { id: string; content_type: string; name: string; slug: string; parent_id?: string | null; description?: string | null }): Promise<void> {
  await db.prepare(
    'INSERT INTO categories (id, content_type, name, slug, parent_id, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(data.id, data.content_type, data.name, data.slug, data.parent_id ?? null, data.description ?? null).run()
}

export async function getCategoryBySlug(db: D1Database, contentType: string, slug: string): Promise<Category | null> {
  return db.prepare('SELECT * FROM categories WHERE content_type = ? AND slug = ?').bind(contentType, slug).first<Category>()
}

export async function updateCategory(db: D1Database, id: string, data: { name?: string; slug?: string; description?: string | null; parent_id?: string | null }): Promise<void> {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
  const values = Object.values(data)
  await db.prepare(`UPDATE categories SET ${fields} WHERE id = ?`).bind(...values, id).run()
}

export async function deleteCategory(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM content_categories WHERE category_id = ?').bind(id).run()
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
}

export async function updateCategorySortOrders(db: D1Database, orders: { id: string; sort_order: number }[]): Promise<void> {
  await db.batch(orders.map(o => db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?').bind(o.sort_order, o.id)))
}

// ── 标签 ────────────────────────────────────────────────────

export async function getTagsByContent(db: D1Database, contentId: string): Promise<Tag[]> {
  const rows = await db.prepare(`
    SELECT t.* FROM tags t
    JOIN content_tags ct ON ct.tag_id = t.id
    WHERE ct.content_id = ?
  `).bind(contentId).all<Tag>()
  return rows.results
}

export async function getAllTags(db: D1Database): Promise<Tag[]> {
  const rows = await db.prepare('SELECT * FROM tags ORDER BY name').all<Tag>()
  return rows.results
}

export async function getTagsWithCount(db: D1Database): Promise<(Tag & { count: number })[]> {
  const rows = await db.prepare(`
    SELECT t.*, COUNT(ct.content_id) as count
    FROM tags t LEFT JOIN content_tags ct ON ct.tag_id = t.id
    GROUP BY t.id ORDER BY t.name
  `).all<Tag & { count: number }>()
  return rows.results
}

export async function createTag(db: D1Database, data: { id: string; name: string; slug: string }): Promise<void> {
  await db.prepare('INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)').bind(data.id, data.name, data.slug).run()
}

export async function updateTag(db: D1Database, id: string, data: { name?: string; slug?: string }): Promise<void> {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
  const values = Object.values(data)
  await db.prepare(`UPDATE tags SET ${fields} WHERE id = ?`).bind(...values, id).run()
}

export async function deleteTag(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM content_tags WHERE tag_id = ?').bind(id).run()
  await db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run()
}

export async function getTagBySlug(db: D1Database, slug: string): Promise<Tag | null> {
  return db.prepare('SELECT * FROM tags WHERE slug = ?').bind(slug).first<Tag>()
}

export async function ensureTagsAndGetSlugs(
  db: D1Database,
  tagNames: string[]
): Promise<{ name: string; slug: string }[]> {
  const result: { name: string; slug: string }[] = []
  for (const name of tagNames) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const existing = await db.prepare('SELECT id, slug FROM tags WHERE name = ?').bind(trimmed).first<{ id: string; slug: string }>()
    if (existing) {
      result.push({ name: trimmed, slug: existing.slug })
    } else {
      const tagId = crypto.randomUUID().replace(/-/g, '')
      const slug = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^\x00-\x7F]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || tagId
      await db.prepare('INSERT OR IGNORE INTO tags (id, name, slug) VALUES (?, ?, ?)').bind(tagId, trimmed, slug).run()
      result.push({ name: trimmed, slug })
    }
  }
  return result
}

export async function setContentTags(db: D1Database, contentId: string, tagNames: string[]): Promise<void> {
  await db.prepare('DELETE FROM content_tags WHERE content_id = ?').bind(contentId).run()
  for (const name of tagNames) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const existing = await db.prepare('SELECT id FROM tags WHERE name = ?').bind(trimmed).first<{ id: string }>()
    const tagId = existing?.id ?? crypto.randomUUID().replace(/-/g, '')
    const slug = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^\x00-\x7F]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || tagId
    if (!existing) {
      await db.prepare('INSERT OR IGNORE INTO tags (id, name, slug) VALUES (?, ?, ?)').bind(tagId, trimmed, slug).run()
    }
    await db.prepare('INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)').bind(contentId, tagId).run()
  }
}

export async function getCategoriesByContent(db: D1Database, contentId: string): Promise<Category[]> {
  const rows = await db.prepare(`
    SELECT cat.* FROM categories cat
    JOIN content_categories cc ON cc.category_id = cat.id
    WHERE cc.content_id = ?
    ORDER BY cat.name
  `).bind(contentId).all<Category>()
  return rows.results
}

export async function setContentCategories(db: D1Database, contentId: string, categoryIds: string[]): Promise<void> {
  await db.prepare('DELETE FROM content_categories WHERE content_id = ?').bind(contentId).run()
  for (const catId of categoryIds) {
    await db.prepare('INSERT OR IGNORE INTO content_categories (content_id, category_id) VALUES (?, ?)').bind(contentId, catId).run()
  }
}

export async function getPagesByParent(db: D1Database, parentId: string | null): Promise<Content[]> {
  const rows = parentId
    ? await db.prepare('SELECT * FROM contents WHERE type = ? AND parent_id = ? ORDER BY sort_order, title').bind('page', parentId).all<Content>()
    : await db.prepare('SELECT * FROM contents WHERE type = ? AND parent_id IS NULL ORDER BY sort_order, title').bind('page').all<Content>()
  return rows.results.map(parseContent)
}

export async function getContentWithMeta(db: D1Database, id: string): Promise<Content | null> {
  const content = await getContent(db, id)
  if (!content) return null
  const [tags, categories] = await Promise.all([
    getTagsByContent(db, content.id),
    getCategoriesByContent(db, content.id),
  ])
  return { ...content, tags, categories }
}

export async function getContentBySlugWithMeta(db: D1Database, type: string, slug: string): Promise<Content | null> {
  const content = await getContentBySlug(db, type, slug)
  if (!content) return null
  const [tags, categories, author] = await Promise.all([
    getTagsByContent(db, content.id),
    getCategoriesByContent(db, content.id),
    content.author_id ? getUserById(db, content.author_id) : Promise.resolve(null),
  ])
  return { ...content, tags, categories, ...(author ? { author } : {}) }
}

export async function getRelatedPosts(db: D1Database, postId: string, limit = 4): Promise<Content[]> {
  const [catRows, tagRows] = await Promise.all([
    db.prepare('SELECT category_id FROM content_categories WHERE content_id = ?').bind(postId).all<{ category_id: string }>(),
    db.prepare('SELECT tag_id FROM content_tags WHERE content_id = ?').bind(postId).all<{ tag_id: string }>(),
  ])
  const catIds = catRows.results.map(r => r.category_id)
  const tagIds = tagRows.results.map(r => r.tag_id)
  if (catIds.length === 0 && tagIds.length === 0) return []

  // Collect candidate IDs via category then tag
  const seen = new Set<string>([postId])
  const candidates: string[] = []

  if (catIds.length) {
    const ph = catIds.map(() => '?').join(',')
    const rows = await db.prepare(
      `SELECT DISTINCT content_id FROM content_categories WHERE category_id IN (${ph}) AND content_id != ? LIMIT 20`
    ).bind(...catIds, postId).all<{ content_id: string }>()
    for (const r of rows.results) { if (!seen.has(r.content_id)) { seen.add(r.content_id); candidates.push(r.content_id) } }
  }
  if (tagIds.length && candidates.length < limit * 2) {
    const ph = tagIds.map(() => '?').join(',')
    const rows = await db.prepare(
      `SELECT DISTINCT content_id FROM content_tags WHERE tag_id IN (${ph}) AND content_id != ? LIMIT 20`
    ).bind(...tagIds, postId).all<{ content_id: string }>()
    for (const r of rows.results) { if (!seen.has(r.content_id)) { seen.add(r.content_id); candidates.push(r.content_id) } }
  }

  if (candidates.length === 0) {
    // 无分类/标签关联时，回退到最新文章
    const rows = await db.prepare(
      `SELECT * FROM contents WHERE id != ? AND type = 'post' AND status = 'published' ORDER BY published_at DESC LIMIT ?`
    ).bind(postId, limit).all<Content>()
    return rows.results
  }
  const ids = candidates.slice(0, limit * 2)
  const ph = ids.map(() => '?').join(',')
  const rows = await db.prepare(
    `SELECT * FROM contents WHERE id IN (${ph}) AND type = 'post' AND status = 'published' ORDER BY published_at DESC LIMIT ?`
  ).bind(...ids, limit).all<Content>()
  return rows.results
}

// ── 用户 ────────────────────────────────────────────────────

export async function getUserByEmail(db: D1Database, email: string): Promise<User & { password_hash: string } | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  return db.prepare('SELECT id, email, name, avatar, role, last_login, created_at FROM users WHERE id = ?').bind(id).first()
}

export async function createUser(db: D1Database, data: { id: string; email: string; name: string; role: string; password_hash: string }): Promise<void> {
  await db.prepare('INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)').bind(
    data.id, data.email, data.name, data.role, data.password_hash
  ).run()
}

export async function listUsers(db: D1Database): Promise<User[]> {
  const rows = await db.prepare(
    'SELECT id, email, name, avatar, role, last_login, created_at FROM users ORDER BY created_at ASC'
  ).all<User>()
  return rows.results
}

export async function updateUser(db: D1Database, id: string, data: { name?: string; role?: string; avatar?: string | null }): Promise<void> {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined)
  if (!entries.length) return
  const sets = entries.map(([k]) => `${k} = ?`).join(', ')
  const vals = entries.map(([, v]) => v)
  await db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).bind(...vals, id).run()
}

export async function updateUserPassword(db: D1Database, id: string, passwordHash: string): Promise<void> {
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, id).run()
}

export async function deleteUser(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
}

// ── 媒体 ────────────────────────────────────────────────────

export async function getMediaList(db: D1Database, page = 1, pageSize = 30): Promise<ListResult<Media>> {
  return paginate<Media>(
    db,
    'SELECT * FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [pageSize, (page - 1) * pageSize],
    'SELECT COUNT(*) as total FROM media',
    [],
    page,
    pageSize
  )
}

export async function getMediaById(db: D1Database, id: string): Promise<Media | null> {
  return db.prepare('SELECT * FROM media WHERE id = ?').bind(id).first<Media>()
}

export async function deleteMedia(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM media WHERE id = ?').bind(id).run()
}

export async function createMedia(db: D1Database, data: Omit<Media, 'created_at'>): Promise<void> {
  await db.prepare(`
    INSERT INTO media (id, filename, r2_key, url, mime_type, size, width, height, alt, ai_alt, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(data.id, data.filename, data.r2_key, data.url, data.mime_type, data.size, data.width, data.height, data.alt, data.ai_alt, data.uploaded_by).run()
}

export async function updateMedia(
  db: D1Database,
  id: string,
  data: Partial<Pick<Media, 'alt' | 'ai_alt' | 'width' | 'height'>>
): Promise<void> {
  const fields = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`)
  if (!fields.length) return
  const values = Object.entries(data).filter(([, v]) => v !== undefined).map(([, v]) => v)
  await db.prepare(`UPDATE media SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values, id).run()
}

// ── AI 任务 ─────────────────────────────────────────────────

function parseAITask(row: Record<string, unknown>): AITask {
  return {
    ...row as unknown as AITask,
    input: JSON.parse(row.input as string || '{}'),
    output: row.output ? JSON.parse(row.output as string) : null,
  }
}

export async function createAITask(
  db: D1Database,
  data: { id: string; type: AITaskType; input: Record<string, unknown> }
): Promise<void> {
  await db.prepare(
    `INSERT INTO ai_tasks (id, type, status, input) VALUES (?, ?, 'pending', ?)`
  ).bind(data.id, data.type, JSON.stringify(data.input)).run()
}

export async function updateAITask(
  db: D1Database,
  id: string,
  updates: { status: AITaskStatus; output?: unknown; error?: string | null; completed_at?: number }
): Promise<void> {
  const fields: string[] = ['status = ?']
  const values: unknown[] = [updates.status]
  if (updates.output !== undefined) { fields.push('output = ?'); values.push(JSON.stringify(updates.output)) }
  if (updates.error !== undefined) { fields.push('error = ?'); values.push(updates.error) }
  if (updates.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(updates.completed_at) }
  await db.prepare(`UPDATE ai_tasks SET ${fields.join(', ')} WHERE id = ?`).bind(...values, id).run()
}

export async function getAITask(db: D1Database, id: string): Promise<AITask | null> {
  const row = await db.prepare('SELECT * FROM ai_tasks WHERE id = ?').bind(id).first<Record<string, unknown>>()
  return row ? parseAITask(row) : null
}

export async function getAITasks(db: D1Database, page = 1, pageSize = 20): Promise<ListResult<AITask>> {
  const offset = (page - 1) * pageSize
  const [rows, countRow] = await Promise.all([
    db.prepare('SELECT * FROM ai_tasks ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(pageSize, offset).all<Record<string, unknown>>(),
    db.prepare('SELECT COUNT(*) as total FROM ai_tasks').first<{ total: number }>(),
  ])
  const total = countRow?.total ?? 0
  return {
    items: rows.results.map(parseAITask),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}

// ── 设置 ────────────────────────────────────────────────────

export async function getSetting<T = unknown>(db: D1Database, key: string): Promise<T | null> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>()
  return row ? JSON.parse(row.value) as T : null
}

export async function getSettings(db: D1Database, keys?: string[]): Promise<Record<string, unknown>> {
  const sql = keys?.length
    ? `SELECT key, value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`
    : 'SELECT key, value FROM settings'
  const rows = await db.prepare(sql).bind(...(keys ?? [])).all<{ key: string; value: string }>()
  return Object.fromEntries(rows.results.map(r => [r.key, JSON.parse(r.value)]))
}

export async function setSetting(db: D1Database, key: string, value: unknown): Promise<void> {
  await db.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch()) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()'
  ).bind(key, JSON.stringify(value)).run()
}

// ── 表单 ────────────────────────────────────────────────────

function parseForm(r: Record<string, unknown>): Form {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    description: (r.description as string) || '',
    fields: JSON.parse((r.fields as string) || '[]'),
    webhook_url: (r.webhook_url as string) || '',
    webhook_headers: JSON.parse((r.webhook_headers as string) || '{}'),
    webhook_field_map: JSON.parse((r.webhook_field_map as string) || '{}'),
    submit_message: (r.submit_message as string) || '提交成功！我们会尽快与您联系。',
    status: (r.status as 'active' | 'paused') || 'active',
    created_at: r.created_at as number,
    updated_at: r.updated_at as number,
  }
}

function parseSubmission(r: Record<string, unknown>): FormSubmission {
  return {
    id: r.id as string,
    form_id: r.form_id as string,
    data: JSON.parse((r.data as string) || '{}'),
    source_url: (r.source_url as string) || '',
    ip: (r.ip as string) || '',
    webhook_status: (r.webhook_status as FormSubmission['webhook_status']) || 'pending',
    webhook_sent_at: (r.webhook_sent_at as number | null) ?? null,
    webhook_response: (r.webhook_response as string) || '',
    created_at: r.created_at as number,
  }
}

export async function getForms(db: D1Database): Promise<Form[]> {
  const rows = await db.prepare('SELECT * FROM forms ORDER BY created_at DESC').all<Record<string, unknown>>()
  return rows.results.map(parseForm)
}

export async function getFormById(db: D1Database, id: string): Promise<Form | null> {
  const row = await db.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<Record<string, unknown>>()
  return row ? parseForm(row) : null
}

export async function getFormBySlug(db: D1Database, slug: string): Promise<Form | null> {
  const row = await db.prepare('SELECT * FROM forms WHERE slug = ?').bind(slug).first<Record<string, unknown>>()
  return row ? parseForm(row) : null
}

export async function createForm(db: D1Database, data: Omit<Form, 'created_at' | 'updated_at'>): Promise<void> {
  await db.prepare(`
    INSERT INTO forms (id, name, slug, description, fields, webhook_url, webhook_headers, webhook_field_map, submit_message, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.id, data.name, data.slug, data.description,
    JSON.stringify(data.fields), data.webhook_url,
    JSON.stringify(data.webhook_headers), JSON.stringify(data.webhook_field_map),
    data.submit_message, data.status,
  ).run()
}

export async function updateForm(db: D1Database, id: string, data: Partial<Omit<Form, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const map: Record<string, unknown> = {}
  if (data.name !== undefined) map.name = data.name
  if (data.slug !== undefined) map.slug = data.slug
  if (data.description !== undefined) map.description = data.description
  if (data.fields !== undefined) map.fields = JSON.stringify(data.fields)
  if (data.webhook_url !== undefined) map.webhook_url = data.webhook_url
  if (data.webhook_headers !== undefined) map.webhook_headers = JSON.stringify(data.webhook_headers)
  if (data.webhook_field_map !== undefined) map.webhook_field_map = JSON.stringify(data.webhook_field_map)
  if (data.submit_message !== undefined) map.submit_message = data.submit_message
  if (data.status !== undefined) map.status = data.status
  if (Object.keys(map).length === 0) return
  const sets = Object.keys(map).map(k => `${k} = ?`).join(', ')
  await db.prepare(`UPDATE forms SET ${sets}, updated_at = unixepoch() WHERE id = ?`).bind(...Object.values(map), id).run()
}

export async function deleteForm(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM forms WHERE id = ?').bind(id).run()
}

export async function getFormSubmissions(db: D1Database, formId: string, page = 1, pageSize = 20): Promise<{ items: FormSubmission[]; total: number }> {
  const offset = (page - 1) * pageSize
  const [rows, countRow] = await Promise.all([
    db.prepare('SELECT * FROM form_submissions WHERE form_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(formId, pageSize, offset).all<Record<string, unknown>>(),
    db.prepare('SELECT COUNT(*) as total FROM form_submissions WHERE form_id = ?').bind(formId).first<{ total: number }>(),
  ])
  return { items: rows.results.map(parseSubmission), total: countRow?.total ?? 0 }
}

export async function createFormSubmission(db: D1Database, data: Omit<FormSubmission, 'created_at'>): Promise<void> {
  await db.prepare(`
    INSERT INTO form_submissions (id, form_id, data, source_url, ip, webhook_status, webhook_sent_at, webhook_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.id, data.form_id, JSON.stringify(data.data),
    data.source_url, data.ip, data.webhook_status,
    data.webhook_sent_at, data.webhook_response,
  ).run()
}

export async function updateFormSubmission(db: D1Database, id: string, data: Partial<Pick<FormSubmission, 'webhook_status' | 'webhook_sent_at' | 'webhook_response'>>): Promise<void> {
  const map: Record<string, unknown> = {}
  if (data.webhook_status !== undefined) map.webhook_status = data.webhook_status
  if (data.webhook_sent_at !== undefined) map.webhook_sent_at = data.webhook_sent_at
  if (data.webhook_response !== undefined) map.webhook_response = data.webhook_response
  if (Object.keys(map).length === 0) return
  const sets = Object.keys(map).map(k => `${k} = ?`).join(', ')
  await db.prepare(`UPDATE form_submissions SET ${sets} WHERE id = ?`).bind(...Object.values(map), id).run()
}

export async function deleteFormSubmission(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM form_submissions WHERE id = ?').bind(id).run()
}

export async function getFormSubmissionById(db: D1Database, id: string): Promise<FormSubmission | null> {
  const row = await db.prepare('SELECT * FROM form_submissions WHERE id = ?').bind(id).first<Record<string, unknown>>()
  return row ? parseSubmission(row) : null
}

// ── API Keys ──────────────────────────────────────────────

export async function createApiKey(
  db: D1Database,
  userId: string,
  name: string,
  permissions: string[],
  keyHash: string,
  keyPrefix: string,
): Promise<string> {
  const id = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  await db.prepare(
    'INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, permissions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, name, keyPrefix, keyHash, JSON.stringify(permissions), now).run()
  return id
}

export async function listApiKeys(db: D1Database, userId: string): Promise<import('@/types').ApiKey[]> {
  const rows = await db.prepare(
    'SELECT id, user_id, name, key_prefix, permissions, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()
  return (rows.results as Record<string, unknown>[]).map(r => ({
    ...r,
    permissions: JSON.parse(r.permissions as string),
  })) as import('@/types').ApiKey[]
}

export async function deleteApiKey(db: D1Database, id: string, userId: string): Promise<void> {
  await db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').bind(id, userId).run()
}

export async function getApiKeyByHash(db: D1Database, hash: string): Promise<{ user_id: string; permissions: string[] } | null> {
  const row = await db.prepare(
    'SELECT user_id, permissions FROM api_keys WHERE key_hash = ?'
  ).bind(hash).first() as Record<string, unknown> | null
  if (!row) return null
  // update last_used_at async (fire and forget)
  db.prepare('UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?')
    .bind(Math.floor(Date.now() / 1000), hash).run().catch(() => {})
  return { user_id: row.user_id as string, permissions: JSON.parse(row.permissions as string) }
}

// ── 友情链接 ────────────────────────────────────────────────

export async function getLinks(db: D1Database, includeHidden = false): Promise<Link[]> {
  const sql = includeHidden
    ? 'SELECT * FROM links ORDER BY sort_order ASC, created_at ASC'
    : "SELECT * FROM links WHERE status = 'active' ORDER BY sort_order ASC, created_at ASC"
  const rows = await db.prepare(sql).all<Link>()
  return rows.results
}

export async function createLink(db: D1Database, data: Omit<Link, 'created_at'>): Promise<void> {
  await db.prepare(
    'INSERT INTO links (id, name, url, description, logo, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(data.id, data.name, data.url, data.description ?? null, data.logo ?? null, data.sort_order, data.status).run()
}

export async function updateLink(db: D1Database, id: string, data: Partial<Omit<Link, 'id' | 'created_at'>>): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = []
  if (data.name       !== undefined) { sets.push('name = ?');        params.push(data.name) }
  if (data.url        !== undefined) { sets.push('url = ?');         params.push(data.url) }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
  if (data.logo       !== undefined) { sets.push('logo = ?');        params.push(data.logo) }
  if (data.sort_order !== undefined) { sets.push('sort_order = ?');   params.push(data.sort_order) }
  if (data.status     !== undefined) { sets.push('status = ?');      params.push(data.status) }
  if (!sets.length) return
  await db.prepare(`UPDATE links SET ${sets.join(', ')} WHERE id = ?`).bind(...params, id).run()
}

export async function deleteLink(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM links WHERE id = ?').bind(id).run()
}

export async function publishScheduled(db: D1Database): Promise<{ published: number; ids: string[] }> {
  const now = Math.floor(Date.now() / 1000)
  const rows = await db.prepare(
    `SELECT id FROM contents WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?`
  ).bind(now).all<{ id: string }>()
  const ids = rows.results.map(r => r.id)
  if (ids.length === 0) return { published: 0, ids: [] }
  await db.prepare(
    `UPDATE contents SET status = 'published', published_at = scheduled_at, updated_at = ? WHERE status = 'scheduled' AND scheduled_at <= ?`
  ).bind(now, now).run()
  return { published: ids.length, ids }
}

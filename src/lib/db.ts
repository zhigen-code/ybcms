import type { Content, ContentType, Category, Tag, User, Media, Plugin, ListResult, AITask, AITaskType, AITaskStatus } from '@/types'

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

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

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
  return parseContent(row)
}

export async function getContentBySlug(db: D1Database, type: string, slug: string): Promise<Content | null> {
  const row = await db.prepare('SELECT * FROM contents WHERE type = ? AND slug = ?').bind(type, slug).first<Content>()
  if (!row) return null
  return parseContent(row)
}

function parseContent(row: Content): Content {
  return {
    ...row,
    ai_generated: Boolean(row.ai_generated),
    ai_reviewed: Boolean(row.ai_reviewed),
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
  const rows = await db.prepare('SELECT * FROM categories WHERE content_type = ? ORDER BY name').bind(contentType).all<Category>()
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

export async function setContentTags(db: D1Database, contentId: string, tagNames: string[]): Promise<void> {
  await db.prepare('DELETE FROM content_tags WHERE content_id = ?').bind(contentId).run()
  for (const name of tagNames) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const existing = await db.prepare('SELECT id FROM tags WHERE name = ?').bind(trimmed).first<{ id: string }>()
    const tagId = existing?.id ?? crypto.randomUUID().replace(/-/g, '')
    const slug = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || tagId
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
  const [tags, categories] = await Promise.all([
    getTagsByContent(db, content.id),
    getCategoriesByContent(db, content.id),
  ])
  return { ...content, tags, categories }
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

  if (candidates.length === 0) return []
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

// ── 插件 ────────────────────────────────────────────────────

export async function getPlugins(db: D1Database): Promise<Plugin[]> {
  const rows = await db.prepare('SELECT * FROM plugins ORDER BY installed_at').all<Record<string, unknown>>()
  return rows.results.map(r => ({
    id: r.id as string,
    name: r.name as string,
    version: r.version as string,
    enabled: Boolean(r.enabled),
    config: JSON.parse((r.config as string) || '{}'),
    installed_at: r.installed_at as number,
    updated_at: r.updated_at as number,
  }))
}

export async function setPluginEnabled(db: D1Database, id: string, enabled: boolean): Promise<void> {
  await db.prepare('UPDATE plugins SET enabled = ?, updated_at = unixepoch() WHERE id = ?').bind(enabled ? 1 : 0, id).run()
}

import { generateSEOMeta, generateText, DEFAULT_MODELS } from '@/lib/ai'
import { getContents, updateContent } from '@/lib/db'
import { getSiteSettings } from '@/lib/config'
import type { AgentResult, AgentRunOptions } from './base'

async function generateExcerpt(env: CloudflareEnv, title: string, content: string, model: string): Promise<string> {
  const plain = content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_`~>]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 2000)

  const prompt = `请为以下文章写一段100字以内的摘要，直接输出摘要内容，不要任何前缀或解释。\n标题：${title}\n正文节选：${plain}`
  const result = await generateText(env, prompt, undefined, 200, model)
  return (result ?? '').toString().trim().slice(0, 200)
}

export async function runReviewAgent({ db, env, taskId }: AgentRunOptions): Promise<AgentResult> {
  void taskId

  const settings = await getSiteSettings(db)

  // 读取审核 Agent 配置（兼容旧 ai.seo.* 键作为默认值）
  const batchSize         = Number(settings['ai.review.batchSize'] ?? settings['ai.seo.batchSize'] ?? 8)
  const priorityUnreviewed = settings['ai.review.priorityUnreviewed'] !== false // default true
  const fixMeta           = settings['ai.review.fixMeta'] !== false           // default true
  const fixExcerpt        = settings['ai.review.fixExcerpt'] !== false        // default true
  const model             = (settings['ai.review.model'] as string) || (settings['ai.seo.model'] as string) || DEFAULT_MODELS.seo

  const { items: posts } = await getContents(db, {
    type: 'post',
    status: 'published',
    pageSize: batchSize * 5,
  })

  // 过滤需要处理的文章
  const needsWork = posts.filter(p => {
    if (priorityUnreviewed && p.ai_reviewed) return false
    const needsMeta = fixMeta && (!p.meta_title || !p.meta_description)
    const needsExcerpt = fixExcerpt && !p.excerpt
    return needsMeta || needsExcerpt
  }).slice(0, batchSize)

  if (needsWork.length === 0) {
    return { success: true, summary: '所有文章已完整，无需审核', data: { reviewed: 0 } }
  }

  let reviewed = 0
  const results: { id: string; title: string; fixedMeta: boolean; fixedExcerpt: boolean }[] = []
  const errors: { id: string; title: string; error: string }[] = []

  for (const post of needsWork) {
    try {
      const patch: Record<string, unknown> = { ai_reviewed: true }
      let fixedMeta = false
      let fixedExcerpt = false

      if (fixExcerpt && !post.excerpt) {
        const excerpt = await generateExcerpt(env, post.title, post.content ?? '', model)
        if (excerpt) { patch.excerpt = excerpt; fixedExcerpt = true }
      }

      if (fixMeta && (!post.meta_title || !post.meta_description)) {
        const seo = await generateSEOMeta(env, { title: post.title, content: post.content ?? '' }, model)
        if (!post.meta_title) { patch.meta_title = seo.metaTitle || post.title; fixedMeta = true }
        if (!post.meta_description) { patch.meta_description = seo.metaDescription; fixedMeta = true }
      }

      await updateContent(db, post.id, patch)
      reviewed++
      results.push({ id: post.id, title: post.title, fixedMeta, fixedExcerpt })
    } catch (err) {
      errors.push({ id: post.id, title: post.title, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return {
    success: true,
    summary: `审核 ${reviewed} 篇文章${errors.length ? `，${errors.length} 篇失败` : ''}`,
    data: { reviewed, errors, articles: results, config: { batchSize, fixMeta, fixExcerpt, model } },
  }
}

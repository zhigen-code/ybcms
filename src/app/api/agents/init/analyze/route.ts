import { getCloudflareContext } from '@opennextjs/cloudflare'
import { requireAdmin } from '@/lib/auth'
import { getCurrentUserWithApiKey } from '@/lib/apiKeyAuth'
import { analyzeWebsite } from '@/lib/agents/init-agent'
import { z } from 'zod'

const schema = z.object({
  basicInfo: z.object({
    siteName: z.string().min(1),
    language: z.enum(['zh', 'en', 'bilingual']),
    siteType: z.enum(['showcase', 'marketing', 'news', 'ecommerce']),
    industry: z.string().min(1),
    targetAudience: z.string().min(1),
    brandColor: z.string().optional(),
  }),
  contentSourceUrl: z.string().url(),
  styleReferenceUrl: z.string().url().optional(),
})

export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUserWithApiKey(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: '无效参数', details: parsed.error.issues }, { status: 400 })

  try {
    const plan = await analyzeWebsite(
      env,
      parsed.data.basicInfo,
      parsed.data.contentSourceUrl,
      parsed.data.styleReferenceUrl
    )
    return Response.json({ ok: true, plan })
  } catch (err) {
    console.error('[init/analyze]', err)
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { requireAdmin } from '@/lib/auth'
import { getCurrentUserWithApiKey } from '@/lib/apiKeyAuth'
import { executeInitPlan } from '@/lib/agents/init-agent'
import { z } from 'zod'

const contactInfoSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  hours: z.string().optional(),
})

const schema = z.object({
  plan: z.object({
    siteSettings: z.object({ name: z.string(), description: z.string(), url: z.string().optional() }),
    contactInfo: contactInfoSchema.default({}),
    aboutPage: z.object({ title: z.string(), content: z.string() }).optional(),
    teamMembers: z.array(z.object({ name: z.string(), title: z.string(), bio: z.string(), imageUrl: z.string().optional() })).default([]),
    services: z.array(z.object({ name: z.string(), slug: z.string(), description: z.string() })).default([]),
    cases: z.array(z.object({ title: z.string(), description: z.string(), outcome: z.string().optional() })).default([]),
    categories: z.array(z.object({ name: z.string(), slug: z.string(), description: z.string().optional() })).default([]),
    navigation: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    aiConfig: z.object({ siteTopics: z.string(), targetAudience: z.string(), writingStyle: z.string() }),
    importItems: z.array(z.object({
      title: z.string(), content: z.string(), excerpt: z.string(), categorySlug: z.string().optional(),
    })).default([]),
    summary: z.string(),
  }),
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
    const result = await executeInitPlan(env.DB, parsed.data.plan, user!.userId)
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('[init/execute]', err)
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

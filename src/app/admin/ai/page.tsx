import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getAITasks } from '@/lib/db'
import { getSiteSettings } from '@/lib/config'
import AIDashboard from './_components/AIDashboard'


export default async function AIPage() {
  const { env } = getCloudflareContext()

  const [{ items: tasks, pagination }, settings] = await Promise.all([
    getAITasks(env.DB, 1, 20),
    getSiteSettings(env.DB),
  ])

  return (
    <div style={{ padding: '32px 40px 48px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#18181b', letterSpacing: '-0.02em', margin: 0 }}>
          AI 运营
        </h1>
        <p style={{ fontSize: '13px', color: '#71717a', marginTop: '4px' }}>
          内容 Agent · 审核 Agent · 发布计划 · 提示词
        </p>
      </div>

      <AIDashboard
        initialTasks={tasks}
        totalTasks={pagination.total}
        initialSettings={settings}
      />
    </div>
  )
}

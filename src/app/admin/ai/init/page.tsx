import InitWizard from './_components/InitWizard'

export default function InitPage() {
  return (
    <div style={{ padding: '32px 40px 48px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#18181b', letterSpacing: '-0.02em', margin: 0 }}>
          网站初始化
        </h1>
        <p style={{ fontSize: '13px', color: '#71717a', marginTop: '4px' }}>
          从已有网站自动抓取内容，生成分类、导航和 AI 配置
        </p>
      </div>
      <InitWizard />
    </div>
  )
}

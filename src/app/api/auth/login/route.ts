import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getUserByEmail, createUser, setSetting, updateUserPassword } from '@/lib/db'
import { signToken, verifyPassword, hashPassword } from '@/lib/auth'
import { generateId } from '@/lib/utils'
import { isSetupCompleted } from '@/lib/config'
import { z } from 'zod'


const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: '参数错误' }, { status: 400 })
  }

  const { email, password } = parsed.data
  const db = env.DB

  // 首次安装：自动创建管理员账号并标记安装完成
  const setupDone = await isSetupCompleted(db)
  if (!setupDone) {
    const existingAdmin = await getUserByEmail(db, email)
    if (!existingAdmin) {
      await createUser(db, {
        id: generateId(),
        email,
        name: '管理员',
        role: 'admin',
        password_hash: await hashPassword(password),
      })
      await setSetting(db, 'setup.completed', true)
    }
  }

  const user = await getUserByEmail(db, email)
  if (!user) {
    return Response.json({ error: '用户不存在' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return Response.json({ error: '密码错误' }, { status: 401 })
  }

  // Auto-upgrade legacy SHA-256 hashes to PBKDF2 on successful login
  if (!user.password_hash.startsWith('pbkdf2:')) {
    const upgraded = await hashPassword(password)
    await updateUserPassword(db, user.id, upgraded)
  }

  // 更新最后登录时间
  await db.prepare('UPDATE users SET last_login = unixepoch() WHERE id = ?').bind(user.id).run()

  const token = await signToken({ userId: user.id, role: user.role }, env)

  return Response.json(
    { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
    {
      headers: {
        'Set-Cookie': `cms_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 3600}`,
      },
    }
  )
}

import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'cms_token'
const TOKEN_EXPIRY = '7d'

function getSecret(env: CloudflareEnv): Uint8Array {
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not configured')
  return new TextEncoder().encode(env.JWT_SECRET)
}

export async function signToken(payload: { userId: string; role: string }, env: CloudflareEnv): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret(env))
}

export async function verifyToken(token: string, env: CloudflareEnv): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(env))
    return payload as { userId: string; role: string }
  } catch {
    return null
  }
}

export async function getTokenFromRequest(request: Request): Promise<string | null> {
  // 优先从 Authorization header 读取
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)

  // 从 Cookie 读取
  const cookie = request.headers.get('Cookie')
  if (!cookie) return null
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match?.[1] ?? null
}

export async function getCurrentUser(request: Request, env: CloudflareEnv): Promise<{ userId: string; role: string } | null> {
  const token = await getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token, env)
}

export function requireAdmin(user: { role: string } | null): Response | null {
  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    return new Response(JSON.stringify({ error: '未授权，请先登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}

export function requireSuperAdmin(user: { role: string } | null): Response | null {
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ error: '权限不足，需要管理员权限' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256
  )
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2:${saltHex}:${hashHex}`
}

async function verifyPbkdf2(password: string, saltHex: string, hashHex: string): Promise<boolean> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256
  )
  const inputHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return inputHex === hashHex
}

async function legacySha256(password: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('pbkdf2:')) {
    const [, saltHex, hashHex] = stored.split(':')
    return verifyPbkdf2(password, saltHex, hashHex)
  }
  // Legacy: unsalted SHA-256 (64 hex chars) — still valid for existing accounts
  return (await legacySha256(password)) === stored
}

export async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 生成 API Key：cmsk_ + 32位随机 hex
export function generateApiKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `cmsk_${hex}`
}

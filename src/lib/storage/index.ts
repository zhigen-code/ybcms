import { getSiteSettings } from '@/lib/config'
import type { SiteSettings } from '@/types'
import { R2Driver } from './r2'
import { S3Driver } from './s3'
import { HubDriver } from './hub'

export interface StorageDriver {
  upload(key: string, file: ArrayBuffer, contentType: string): Promise<{ url: string; key: string }>
  delete(key: string): Promise<void>
}

export interface StorageStatus { ready: boolean; reason?: string }

export function checkStorageReady(env: CloudflareEnv, settings: Partial<SiteSettings>): StorageStatus {
  const driver = (settings['storage.driver'] as string) || 'r2'
  if (driver === 'unconfigured') return { ready: false, reason: 'R2 创建失败，请前往「设置 → 存储」配置存储驱动' }
  if (driver === 'hub' && !settings['storage.hub.token']) return { ready: false, reason: 'Hub Token 未配置，请前往「设置 → 存储」填写 Token' }
  if (driver === 's3' && (!settings['storage.s3.endpoint'] || !settings['storage.s3.bucket'])) return { ready: false, reason: 'S3 配置不完整，请前往「设置 → 存储」补全配置' }
  if (driver === 'r2' && !env.R2) return { ready: false, reason: 'R2 绑定不可用，请检查 wrangler.toml 配置' }
  return { ready: true }
}

export async function getStorageDriver(env: CloudflareEnv): Promise<StorageDriver> {
  const settings = await getSiteSettings(env.DB)
  const driver = (settings['storage.driver'] as string) || 'r2'

  if (driver === 'hub') {
    const token = (settings['storage.hub.token'] as string) || ''
    if (!token) {
      console.error('[storage] Hub driver selected but token not set, falling back to R2')
      return new R2Driver(env)
    }
    return new HubDriver(token)
  }

  if (driver === 's3') {
    const accessKeyId     = (env as unknown as Record<string, string>).S3_ACCESS_KEY_ID     || ''
    const secretAccessKey = (env as unknown as Record<string, string>).S3_SECRET_ACCESS_KEY  || ''
    const endpoint  = (settings['storage.s3.endpoint']   as string) || ''
    const bucket    = (settings['storage.s3.bucket']     as string) || ''
    const region    = (settings['storage.s3.region']     as string) || 'auto'
    const publicUrl = (settings['storage.s3.public_url'] as string) || ''

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      console.error('[storage] S3 driver selected but config incomplete, falling back to R2')
      return new R2Driver(env)
    }

    return new S3Driver({ endpoint, bucket, region, publicUrl, accessKeyId, secretAccessKey })
  }

  if (driver === 'unconfigured') {
    throw new Error('storage_unconfigured')
  }

  return new R2Driver(env)
}

// Re-export utilities that were in r2.ts
export { generateMediaKey, isAllowedMimeType } from '@/lib/r2'

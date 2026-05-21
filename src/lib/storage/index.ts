import { getSiteSettings } from '@/lib/config'
import { R2Driver } from './r2'
import { S3Driver } from './s3'

export interface StorageDriver {
  upload(key: string, file: ArrayBuffer, contentType: string): Promise<string>
  delete(key: string): Promise<void>
}

export async function getStorageDriver(env: CloudflareEnv): Promise<StorageDriver> {
  const settings = await getSiteSettings(env.DB)
  const driver = (settings['storage.driver'] as string) || 'r2'

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

  return new R2Driver(env)
}

// Re-export utilities that were in r2.ts
export { generateMediaKey, isAllowedMimeType } from '@/lib/r2'

import type { StorageDriver } from './index'

export class R2Driver implements StorageDriver {
  constructor(private env: CloudflareEnv) {}

  async upload(key: string, file: ArrayBuffer, contentType: string): Promise<{ url: string; key: string }> {
    await this.env.R2.put(key, file, { httpMetadata: { contentType } })
    const base = (this.env.R2_PUBLIC_URL || '').replace(/\/$/, '')
    const url = base ? `${base}/${key}` : `/uploads/${key}`
    return { url, key }
  }

  async delete(key: string): Promise<void> {
    await this.env.R2.delete(key)
  }
}

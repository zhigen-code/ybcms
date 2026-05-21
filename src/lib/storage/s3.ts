import type { StorageDriver } from './index'

interface S3Config {
  endpoint: string       // e.g. https://s3.us-west-002.backblazeb2.com
  bucket: string
  region: string         // 'auto' for R2/B2, 'us-east-1' for AWS
  publicUrl: string      // CDN or bucket public URL prefix
  accessKeyId: string
  secretAccessKey: string
}

// ── minimal AWS Signature V4 ──────────────────────────────────────────────────

const enc = (s: string) => new TextEncoder().encode(s)

const buf2hex = (b: ArrayBuffer) =>
  [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')

async function sha256(data: ArrayBuffer): Promise<string> {
  return buf2hex(await crypto.subtle.digest('SHA-256', data))
}

async function hmac(key: ArrayBuffer | CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  const k = key instanceof CryptoKey
    ? key
    : await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', k, data)
}

async function signingKey(secret: string, date: string, region: string): Promise<ArrayBuffer> {
  const kDate    = await hmac(enc(`AWS4${secret}`), enc(date))
  const kRegion  = await hmac(kDate, enc(region))
  const kService = await hmac(kRegion, enc('s3'))
  return hmac(kService, enc('aws4_request'))
}

async function signRequest(
  method: string,
  url: URL,
  extraHeaders: Record<string, string>,
  body: ArrayBuffer,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
): Promise<Headers> {
  const now = new Date()
  const date     = now.toISOString().slice(0, 10).replace(/-/g, '')        // YYYYMMDD
  const datetime = now.toISOString().replace(/[:-]|\.\d{3}/g, '')           // YYYYMMDDTHHmmssZ

  const payloadHash = await sha256(body)

  const raw: Record<string, string> = {
    ...extraHeaders,
    host: url.host,
    'x-amz-date': datetime,
    'x-amz-content-sha256': payloadHash,
  }

  const sortedKeys    = Object.keys(raw).sort()
  const canonHeaders  = sortedKeys.map(k => `${k}:${raw[k]}\n`).join('')
  const signedHeaders = sortedKeys.join(';')

  const canonRequest = [
    method,
    url.pathname,
    url.search.replace(/^\?/, ''),
    canonHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const credScope   = `${date}/${region}/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', datetime, credScope,
    await sha256(enc(canonRequest).buffer as ArrayBuffer)].join('\n')

  const key = await signingKey(secretAccessKey, date, region)
  const sig = buf2hex(await hmac(key, enc(stringToSign)))

  const headers = new Headers(raw)
  headers.set('Authorization',
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`)
  return headers
}

// ── S3Driver ──────────────────────────────────────────────────────────────────

export class S3Driver implements StorageDriver {
  constructor(private cfg: S3Config) {}

  async upload(key: string, file: ArrayBuffer, contentType: string): Promise<string> {
    const url = new URL(`${this.cfg.endpoint.replace(/\/$/, '')}/${this.cfg.bucket}/${key}`)
    const headers = await signRequest(
      'PUT', url,
      { 'content-type': contentType, 'content-length': String(file.byteLength) },
      file,
      this.cfg.accessKeyId, this.cfg.secretAccessKey, this.cfg.region,
    )
    const res = await fetch(url, { method: 'PUT', headers, body: file })
    if (!res.ok) throw new Error(`S3 upload failed: ${res.status} ${await res.text()}`)
    return `${this.cfg.publicUrl.replace(/\/$/, '')}/${key}`
  }

  async delete(key: string): Promise<void> {
    const url = new URL(`${this.cfg.endpoint.replace(/\/$/, '')}/${this.cfg.bucket}/${key}`)
    const empty = new ArrayBuffer(0)
    const headers = await signRequest(
      'DELETE', url, {}, empty,
      this.cfg.accessKeyId, this.cfg.secretAccessKey, this.cfg.region,
    )
    await fetch(url, { method: 'DELETE', headers })
  }
}

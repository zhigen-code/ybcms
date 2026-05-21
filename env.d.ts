interface CloudflareEnv {
  DB: D1Database
  R2: R2Bucket
  AI: Ai
  QUEUE: Queue
  JWT_SECRET: string
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  NEXT_PUBLIC_SITE_URL: string
  R2_PUBLIC_URL: string
  CRON_SECRET: string
  S3_ACCESS_KEY_ID?: string
  S3_SECRET_ACCESS_KEY?: string
}

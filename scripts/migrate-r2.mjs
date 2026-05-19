#!/usr/bin/env node
/**
 * R2 桶数据迁移脚本（基于 rclone S3 兼容 API）
 *
 * 用法：
 *   node scripts/migrate-r2.mjs --from <源桶名> --to <目标桶名> \
 *     --endpoint <R2端点> --key <AccessKeyId> --secret <SecretAccessKey>
 *
 * 说明：
 *   - endpoint  Cloudflare R2 S3 端点，格式：https://<accountId>.r2.cloudflarestorage.com
 *   - key/secret 来自 Cloudflare Dashboard → R2 → Manage R2 API Tokens
 *   - 使用 rclone copy，仅复制源中存在而目标中不存在或已变更的文件（幂等）
 *   - 支持 --dry-run 参数，只列出变更不实际传输
 *
 * 前提：系统已安装 rclone（apt install rclone / brew install rclone）
 */

import { spawnSync, execFileSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const args = process.argv.slice(2)

function getArg(flag) {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : null
}

const SOURCE   = getArg('--from')
const TARGET   = getArg('--to')
const ENDPOINT = getArg('--endpoint')
const KEY      = getArg('--key')
const SECRET   = getArg('--secret')
const DRY_RUN  = args.includes('--dry-run')

if (!SOURCE || !TARGET || !ENDPOINT || !KEY || !SECRET) {
  console.error(`
用法:
  node scripts/migrate-r2.mjs \\
    --from <源桶名> --to <目标桶名> \\
    --endpoint https://<accountId>.r2.cloudflarestorage.com \\
    --key <AccessKeyId> --secret <SecretAccessKey> \\
    [--dry-run]

获取凭证:
  Cloudflare Dashboard → R2 → Manage R2 API Tokens → Create API Token
  选择需要操作的桶，获取 Access Key ID 和 Secret Access Key
`)
  process.exit(1)
}

// 检查 rclone 是否安装
const check = spawnSync('rclone', ['version'], { encoding: 'utf8' })
if (check.status !== 0) {
  console.error('❌ 未找到 rclone，请先安装：apt install rclone 或 brew install rclone')
  process.exit(1)
}

// 写入临时配置文件（避免凭证出现在命令行参数中）
const configPath = join(tmpdir(), `rclone-r2-${Date.now()}.conf`)
writeFileSync(configPath, `[r2]
type = s3
provider = Cloudflare
access_key_id = ${KEY}
secret_access_key = ${SECRET}
endpoint = ${ENDPOINT}
`, { mode: 0o600 })

function cleanup() {
  try { unlinkSync(configPath) } catch {}
}

process.on('exit', cleanup)
process.on('SIGINT', () => { cleanup(); process.exit(1) })
process.on('SIGTERM', () => { cleanup(); process.exit(1) })

try {
  // 统计源桶文件数
  console.log(`\n🔍 统计 ${SOURCE} 中的文件...`)
  const lsResult = spawnSync('rclone', [
    '--config', configPath,
    'lsl', `r2:${SOURCE}`,
  ], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })

  if (lsResult.status !== 0) {
    throw new Error(`无法访问源桶 ${SOURCE}:\n${lsResult.stderr}`)
  }

  const fileCount = lsResult.stdout.trim().split('\n').filter(Boolean).length
  console.log(`   找到 ${fileCount} 个文件`)

  if (fileCount === 0) {
    console.log('   源桶为空，无需迁移')
    process.exit(0)
  }

  // 执行复制
  const action = DRY_RUN ? '模拟迁移（dry-run）' : '迁移'
  console.log(`\n🚀 ${action}: r2:${SOURCE} → r2:${TARGET}\n`)

  const copyArgs = [
    '--config', configPath,
    'copy',
    `r2:${SOURCE}`,
    `r2:${TARGET}`,
    '--progress',
    '--transfers=8',
    '--checkers=16',
  ]
  if (DRY_RUN) copyArgs.push('--dry-run')

  execFileSync('rclone', copyArgs, { stdio: 'inherit' })

  if (!DRY_RUN) {
    // 验证：统计目标桶文件数
    console.log(`\n✅ 验证目标桶 ${TARGET}...`)
    const verifyResult = spawnSync('rclone', [
      '--config', configPath,
      'lsl', `r2:${TARGET}`,
    ], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })

    const dstCount = verifyResult.stdout.trim().split('\n').filter(Boolean).length
    const ok = dstCount >= fileCount
    console.log(`   源: ${fileCount} 个文件 | 目标: ${dstCount} 个文件 ${ok ? '✅' : '⚠️  数量不符，请检查'}`)
  }

  console.log('\n🎉 R2 迁移完成！')
} catch (e) {
  console.error('\n❌', e.message)
  process.exit(1)
}

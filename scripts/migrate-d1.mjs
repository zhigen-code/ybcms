#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process'
import { writeFileSync, mkdtempSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const args = process.argv.slice(2)
const fromIdx = args.indexOf('--from')
const toIdx = args.indexOf('--to')
if (fromIdx === -1 || toIdx === -1) {
  console.error('用法: node scripts/migrate-d1.mjs --from <源库名> --to <目标库名>')
  process.exit(1)
}
const SOURCE = args[fromIdx + 1]
const TARGET = args[toIdx + 1]
const TMP = mkdtempSync(join(tmpdir(), 'cms-migrate-'))

const SKIP = new Set([
  '_cf_KV', 'd1_migrations', 'sqlite_sequence',
  'contents_fts', 'contents_fts_config', 'contents_fts_content',
  'contents_fts_data', 'contents_fts_docsize', 'contents_fts_idx',
])

const TABLE_ORDER = [
  'migrations', 'content_types', 'users', 'tags', 'categories',
  'contents', 'content_tags', 'content_categories', 'content_fields',
  'media', 'forms', 'form_submissions', 'api_keys', 'ai_tasks',
  'plugins', 'settings',
]

function query(db, sql) {
  // SELECT 用 --command（简单 SQL，无特殊字符），避免 --file 的交互式警告
  const r = spawnSync('npx', [
    'wrangler', 'd1', 'execute', db,
    '--config', 'wrangler.local.toml',
    '--remote', '--json', '--command', sql,
  ], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(r.stderr || r.stdout)
  // 去除 ANSI 转义码后解析 JSON
  const clean = r.stdout.replace(/\x1B\[[0-9;]*m/g, '')
  const jsonStart = clean.indexOf('[')
  if (jsonStart === -1) return []
  return JSON.parse(clean.slice(jsonStart))[0]?.results ?? []
}

function execute(db, sqlFile) {
  const r = spawnSync('npx', [
    'wrangler', 'd1', 'execute', db,
    '--config', 'wrangler.local.toml',
    '--remote', '--file', sqlFile,
  ], { encoding: 'utf8', stdio: 'pipe' })
  if (r.status !== 0) throw new Error(r.stderr || r.stdout)
}

function escape(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '1' : '0'
  return `'${String(val).replace(/'/g, "''")}'`
}

async function runMigrations() {
  const dir = new URL('../migrations', import.meta.url).pathname
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  console.log('\n⚙️  在目标库执行 migrations...')

  // 先获取已应用的版本列表
  let appliedVersions = new Set()
  try {
    const res = query(TARGET, `SELECT version FROM migrations`)
    appliedVersions = new Set(res.map(r => r.version))
  } catch { /* migrations 表不存在，从头开始 */ }

  for (const file of files) {
    const version = parseInt(file.split('_')[0])
    if (appliedVersions.has(version)) {
      console.log(`   ⏭️  ${file}`)
      continue
    }
    console.log(`   → 应用 ${file}`)
    try {
      execute(TARGET, join(dir, file))
    } catch (e) {
      // UNIQUE 约束错误说明已应用，忽略
      if (e.message.includes('UNIQUE') || e.message.includes('already exists')) {
        console.log(`   ⚠️  已存在，跳过`)
      } else {
        throw e
      }
    }
  }
}

async function migrateTable(table) {
  const countRes = query(SOURCE, `SELECT COUNT(*) as c FROM "${table}"`)
  const total = countRes[0]?.c ?? 0
  process.stdout.write(`📋 ${table.padEnd(25)} ${total} 行`)
  if (total === 0) { console.log(' — 跳过'); return }

  const BATCH = 50
  let inserted = 0

  for (let offset = 0; offset < total; offset += BATCH) {
    const rows = query(SOURCE, `SELECT * FROM "${table}" LIMIT ${BATCH} OFFSET ${offset}`)
    if (!rows.length) break

    const cols = Object.keys(rows[0]).map(c => `"${c}"`).join(', ')
    // 每 10 行一条 INSERT
    for (let i = 0; i < rows.length; i += 10) {
      const chunk = rows.slice(i, i + 10)
      const values = chunk.map(row =>
        `(${Object.values(row).map(escape).join(', ')})`
      ).join(',\n  ')
      const sql = `INSERT OR REPLACE INTO "${table}" (${cols}) VALUES\n  ${values};`
      const f = join(TMP, `ins_${Date.now()}_${i}.sql`)
      writeFileSync(f, sql)
      execute(TARGET, f)
      inserted += chunk.length
    }
  }
  console.log(` ✅`)
}

async function main() {
  console.log(`\n🚀 D1 迁移: ${SOURCE} → ${TARGET}`)

  await runMigrations()

  const tables = query(SOURCE, `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .map(r => r.name).filter(t => !SKIP.has(t))

  const ordered = [
    ...TABLE_ORDER.filter(t => tables.includes(t)),
    ...tables.filter(t => !TABLE_ORDER.includes(t)),
  ]

  console.log(`\n📦 迁移 ${ordered.length} 张表:\n`)
  for (const t of ordered) await migrateTable(t)

  console.log('\n🎉 D1 迁移完成！')
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })

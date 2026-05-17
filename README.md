# CMS Lite

> AI 时代的内容管理系统，基于 Cloudflare 全家桶，完全免费部署。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/zhigen-net/CMS-Lite)

## 特性

- **AI 原生**：AI 对话建站、AI 写文章、AI 做 SEO、AI 自动运营
- **极致性能**：Next.js 15 边缘渲染，全球 CDN 加速
- **完全免费**：Cloudflare Pages + D1 + R2 + Workers AI 全免费
- **主题系统**：可视化定制 + AI 生成主题 + 代码编辑器
- **多内容类型**：文章 / 页面 / 产品 / 作品集 + 自定义类型

## 技术栈

| 服务 | 用途 |
|------|------|
| Cloudflare Pages | 托管 + 边缘渲染 |
| Cloudflare D1 | SQLite 数据库 |
| Cloudflare R2 | 媒体文件存储 |
| Workers AI | AI 内容生成 |
| Next.js 15 | 前端框架 |

---

## 部署指南

### 第一步：Fork 仓库

点击右上角 **Fork**，将仓库复制到你的 GitHub 账号。

> **多站点**：如需在同一 Cloudflare 账号部署多个站点，Fork 时修改仓库名称（如 `my-blog`、`company-site`），资源名称将自动隔离。

### 第二步：准备 Cloudflare API Token

1. 进入 [Cloudflare Dashboard](https://dash.cloudflare.com) → **My Profile** → **API Tokens**
2. 点击 **Create Token** → 使用 **Edit Cloudflare Workers** 模板
3. 额外添加以下权限：
   - `D1 — Edit`
   - `Cloudflare Pages — Edit`
4. 记录生成的 Token 和 **Account ID**（在首页右侧）

### 第三步：配置 GitHub Secrets

进入你 Fork 的仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret 名称 | 说明 |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID |
| `CLOUDFLARE_API_TOKEN` | 上一步创建的 API Token |
| `CMS_PROJECT_NAME` | （可选）自定义项目名，默认使用仓库名 |

### 第四步：运行 Setup（仅一次）

进入仓库 → **Actions** → **🚀 Setup (Run Once)** → **Run workflow**

等待约 2 分钟，完成后控制台会输出你的站点地址。

### 第五步：创建管理员账号

访问 `https://你的项目名.pages.dev/admin`，首次登录时输入邮箱和密码即自动创建管理员账号。

---

## 后续更新

当上游仓库有新版本时：

```bash
# 同步上游更新
git pull upstream main

# 推送到你的仓库，GitHub Actions 自动构建部署
git push
```

新增的数据库迁移会在下次部署时自动执行。

---

## 本地开发

```bash
# 安装依赖
npm install

# 初始化本地数据库
npx wrangler d1 execute cms-db --local --file migrations/0001_init.sql
# （依次执行所有 migrations/*.sql）

# 启动开发服务器
npm run dev
```

本地使用真实 Cloudflare 资源：

```bash
# 复制本地配置（已在 .gitignore 中）
cp wrangler.toml wrangler.local.toml
# 编辑 wrangler.local.toml，填入真实的 database_id

# 使用本地配置部署
npm run deploy
```

---

## 开源协议

[MIT](./LICENSE)

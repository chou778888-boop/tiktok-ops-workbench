# Cloudflare 迁移说明

本分支以 GitHub `2c3141c` 为基线，包含完整日报中心、任务中心和日报驱动总览，不包含未完成的达人中心草稿。

## 安全原则

- Netlify 继续作为现网，不删除、不覆盖。
- 现有共享数据先只读备份，再生成 D1 导入文件。
- 导入前后必须核对各集合数量。
- Cloudflare 测试地址验证通过后，才交由团队切换。

## 本地预览

1. 安装依赖：`pnpm install`
2. 初始化本地 D1：`pnpm db:local:init`
3. 启动 Pages：`pnpm dev:cloudflare`

构建脚本只会把 `index.html`、`assets/` 和 `_headers` 放入 `dist/`。迁移脚本、备份、旧 Netlify 函数和项目文档不会进入静态部署包。

## 数据迁移

只读备份文件位于 `.migration-backups/`，不会提交 Git。

生成本地导入 SQL：

```bash
node scripts/prepare-state-import.mjs \
  .migration-backups/netlify-state-2026-07-30.json
```

导入本地 D1：

```bash
wrangler d1 execute tiktok-ops-workbench \
  --local \
  --file=.migration-backups/cloudflare-state-import.sql
```

生产导入必须等用户确认后再执行，并在导入前重新获取一次 Netlify 最新状态。

## 正式资源（确认后）

1. 创建 Cloudflare Pages 项目。
2. 创建 D1 数据库 `tiktok-ops-workbench`。
3. 将真实 `database_id` 写入 `wrangler.jsonc`。
4. 配置 `OPENAI_API_KEY` 与可选 `OPENAI_MODEL`。
5. 执行迁移 SQL并核对数据。
6. 部署测试地址并完成多人并发验证。

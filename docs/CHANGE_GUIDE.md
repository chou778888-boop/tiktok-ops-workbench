# 日常修改指南

## 常见修改位置

| 要修改的内容 | 文件 |
| --- | --- |
| 页面栏目、标题、说明、表单字段 | `index.html` |
| 颜色、字号、间距、响应式排版 | `src/styles/modules/`、`src/styles/tokens.css` |
| 总览、日期范围与图表 | `src/app/workbench/10-overview.js` |
| 日报汇总和周报规则 | `src/app/workbench/30-reports.js` |
| 任务状态与流转 | `src/app/workbench/20-tasks.js` |
| 成本模型 | `src/app/workbench/60-costing.js` |
| 达人导入和展示 | `src/app/workbench/40-creators.js` |
| 前端云端同步与冲突保护 | `src/app/workbench/00-runtime.js` |
| 服务端状态校验与写入 | `functions/api/state.js` |
| 登录后首次启动性能 | `src/app/boot.js`、`functions/api/bootstrap.js` |
| AI 深度分析 | `functions/api/analyze-reports.js` |
| 静态安全响应头 | `_headers` |

## 固定工作流

1. 只改本地源文件，不改 `dist/`。
2. 运行 `pnpm check`。
3. 运行 `pnpm build`。
4. 启动本地 Cloudflare 预览并检查 Mac、Windows 和移动端。
5. 核对日报提交、任务流转、成本保存、达人编辑和云端同步。
6. 用户确认后再提交 Git 和发布 Cloudflare。

如果 pnpm 因非交互环境要求重新确认依赖，可直接按 `package.json` 中的顺序运行现有 Node 检查脚本；不要为此安装或升级依赖。

## 新增或移动应用代码

1. 把代码放入拥有该业务的 `src/app/workbench/` 文件。
2. 如确需新增源码文件，将其登记到 `scripts/app-sources.mjs` 的正确执行位置。
3. 更新 `scripts/test-app-boundaries.mjs` 的关键归属检查。
4. 运行 `node scripts/test-app-sources.mjs`，确认合并顺序和源码基准符合预期。
5. 构建后确认生产环境仍只有一个完整工作台脚本。

## 禁止事项

- 不把密码、API Key、Cloudflare Token 写入前端或 Git。
- 不用整页覆盖方式保存团队数据。
- 不在没有预览清单时执行批量删除。
- 不直接修改 `dist/`，因为下次构建会覆盖。
- 不在一次改动中同时重写多个核心板块。
- 不绕过 `scripts/app-sources.mjs` 直接把业务脚本加入页面。

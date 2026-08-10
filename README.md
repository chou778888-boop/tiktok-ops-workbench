# TikTok 经营中枢

基于 Cloudflare Pages、Pages Functions 和 D1 的团队运营工作台，包含总览、日报、任务、成本测算、达人中心和运营学院。

## 本地开发

日常本地预览使用不依赖 Cloudflare OAuth 的配置，并继续复用 `.wrangler/state` 中的本地 D1 数据：

```bash
npm run dev:local
```

固定访问地址为 `http://127.0.0.1:52098/`。本地预览不绑定远程 AI；AI 深度分析接口会提示尚未配置，但日报、任务、利润及其他本地功能不受影响。

```bash
pnpm install
pnpm check
pnpm build
pnpm dev:cloudflare
```

源文件与构建产物已经分离。日常修改只编辑 `index.html`、`src/`、`functions/` 和 `assets/`，不要直接修改 `dist/`。

## 文档

- [架构说明](docs/ARCHITECTURE.md)
- [应用模块与修改位置](docs/APP_MODULES.md)
- [日常修改指南](docs/CHANGE_GUIDE.md)
- [安全基线](docs/SECURITY.md)

## 发布规则

所有调整先完成本地预览和全流程检查，经用户确认后再提交 GitHub 和部署 Cloudflare。构建与部署不得写入或覆盖团队业务数据。

应用源码按 `scripts/app-sources.mjs` 的固定顺序合并，线上仍只加载一个完整工作台脚本。新增或移动业务源码时必须同步更新模块清单与边界测试。

## 固定排版规则

- 按钮文案必须水平、垂直居中，并保持完整单行；图标不得把文字挤出或造成孤字换行。
- 表头、状态标签和主要操作默认不换行；确需换行时必须以完整语义分组。
- 每次界面调整都必须检查约 320px 窄窗口和桌面宽屏，不以单一尺寸作为完成标准。
- 优先减少装饰和视觉噪声，保持信息层级、对齐关系和留白一致。

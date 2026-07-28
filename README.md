# TikTok 运营工作台

团队共享版 TikTok 运营工作台，包含：

- 今日经营总览
- 数据录入
- 异常看板
- 任务中心
- 达人中心
- 运营学院
- Netlify 云端数据同步

## Netlify 自动部署配置

推荐使用 GitHub 仓库绑定 Netlify：

1. 将本项目推送到 GitHub 仓库。
2. 在 Netlify 当前站点中进入 `Site configuration`。
3. 找到 `Build & deploy` -> `Continuous deployment`。
4. 选择 `Link repository`，授权并选择本仓库。
5. Build settings：

```bash
Build command: npm run build
Publish directory: .
Functions directory: netlify/functions
```

绑定完成后，之后只要 GitHub 主分支有新提交，Netlify 会自动重新部署。

## 数据同步说明

线上页面会通过：

```text
/.netlify/functions/state
```

读取和保存团队共享数据。顶部显示 `已同步` 时，说明当前正在使用云端共享数据。

本地直接打开 `index.html` 会进入本地模式，仅用于预览页面结构。

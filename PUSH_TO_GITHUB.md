# 推送到 GitHub

仓库地址：

```text
https://github.com/v4bfthkw8v-pixel/tiktok-ops-workbench.git
```

在 Mac 终端执行：

```bash
cd /Users/a111/Documents/Codex/2026-07-16/new-chat/work/tiktok-ops-workbench-v1
git push -u origin main
```

如果提示登录 GitHub，按提示登录即可。

推送成功后，回到 Netlify 当前站点，绑定这个 GitHub 仓库：

```text
v4bfthkw8v-pixel/tiktok-ops-workbench
```

Netlify 构建配置：

```text
Build command: npm run build
Publish directory: .
Functions directory: netlify/functions
```

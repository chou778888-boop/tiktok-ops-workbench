# 本地工作台常驻服务

普通的 `npm run dev:local` 会随终端或 Codex 执行会话结束。需要固定使用 `http://127.0.0.1:52098/` 时，在 macOS 上安装一次用户级常驻服务：

```bash
npm run dev:local:install
```

服务由 `launchd` 托管，登录后自动运行，异常退出后自动恢复；启动时会重新构建前端，并继续复用 `.wrangler/state` 中的本地 D1 数据。

查看服务状态：

```bash
npm run dev:local:status
```

卸载服务：

```bash
npm run dev:local:uninstall
```

运行日志保存在 `.local-preview/service.log` 和 `.local-preview/service-error.log`。

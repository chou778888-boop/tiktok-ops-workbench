# TikTok 运营工作台 Netlify 部署说明

## 重要说明

这个版本已经加入团队共享数据能力：

- 页面打开时会从 Netlify 云端读取最新数据。
- 保存、编辑、导入、创建任务、维护达人时，会自动同步到云端。
- 如果直接在本地打开 `index.html`，会进入本地模式，只保存在当前电脑浏览器里。

## 推荐部署方式：GitHub + Netlify

1. 将本文件夹推送到 GitHub 仓库。
2. 打开 Netlify，选择 Add new site -> Import an existing project。
3. 连接 GitHub 仓库。
4. Build command 填：

```bash
npm run build
```

5. Publish directory 填：

```bash
.
```

6. 部署完成后，把 Netlify 生成的网址发给团队成员。

## 不建议只用 Netlify Drop

普通拖拽更适合纯静态页面。这个工作台需要 `netlify/functions/state.mjs`
来做团队共享数据同步，所以建议使用 GitHub 导入或 Netlify CLI 部署，
让 Netlify 正确识别并发布 Functions。

## CLI 部署方式

如果本机已经安装 Netlify CLI，可以在本文件夹执行：

```bash
netlify login
netlify deploy --prod --dir=. --functions=netlify/functions
```

首次部署时，Netlify 会要求选择或创建站点。按页面提示授权即可。

## 团队使用注意

- 第一版是共享数据，但还没有账号权限系统。
- 拿到链接的人都可以编辑数据。
- 正式给团队长期使用前，建议下一步加入登录、权限、操作日志和数据备份。

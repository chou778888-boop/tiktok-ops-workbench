# 工作台架构

## 目标

在不牺牲现有内容的前提下，让页面结构、视觉、业务逻辑和云端接口可以分别修改、分别检查、分别回滚。

## 当前目录

```text
index.html                    页面结构与可见文案
src/styles/                   设计令牌、样式入口和20个有序样式模块
src/app/boot.js               轻量登录入口、单请求启动和主脚本按需加载
src/app/workbench/            16个有序业务源码模块
functions/api/                Cloudflare Pages Functions 接口
functions/_shared/http.js     接口共同安全边界
assets/                       图片、模板、达人头像和静态资料
scripts/app-sources.mjs       应用源码顺序和合并入口
scripts/build-cloudflare.mjs  生成带版本指纹的线上静态包
scripts/check-project.mjs     发布前结构完整性检查
dist/                         构建产物，不直接手工修改
```

应用源码模块依次负责：运行时与云端状态、总览、任务、日报、达人、经营记录、成本、导航、事件和初始化。详细修改索引见 `docs/APP_MODULES.md`。

## 构建与数据流

```text
index.html → boot.js → /api/bootstrap → 有序工作台源码
有序工作台源码 → build-cloudflare.mjs → 单一生产 workbench 脚本
页面业务修改 → 增量 /api/state 补丁 → D1 revision 冲突保护
```

源码拆分不改变浏览器运行模型。构建器按 `scripts/app-sources.mjs` 合并后再生成版本哈希和压缩脚本，因此线上请求数量、执行顺序和功能保持不变。

## 为什么暂不引入 React 或 Vue

工作台当前以表单、表格和内部运营流程为主，没有复杂前端路由或多人组件团队。直接迁移到大型框架会增加依赖、重写风险和后续维护门槛。现阶段采用原生模块、明确目录和自动构建，更适合频繁小步调整。

当前继续使用原生 JavaScript 和构建期源码合并。这样既能按业务文件维护，又不会增加浏览器模块请求或引入框架迁移风险。未来只有在独立需求明确需要运行时模块边界时，才单独评估 ES Modules 或前端框架。

## 数据原则

- 页面发布与团队数据更新是两条独立链路。
- 前端保存使用增量补丁和版本号，避免旧页面覆盖新数据。
- 不在构建、部署或重构时写入云端业务数据。
- 数据结构变更必须新增 migration，不直接改生产表。
- 删除、恢复和批量导入都必须先显示预览清单。

## 启动与登录链路

1. 未登录页面只加载 HTML、CSS 和轻量 `boot.js`，不下载或执行完整工作台脚本。
2. `GET /api/bootstrap` 使用一次 D1 Session 批处理同时校验会话并读取团队状态；日常启动允许就近读副本。
3. 新登录后的 `GET /api/bootstrap?fresh=1` 强制读取主库，确保刚创建的会话与最新业务数据立即可见。
4. 已登录用户取得 `user + data + revision` 后才按需加载构建生成的单一工作台脚本。
5. 新登录成功后直接请求 bootstrap 并进入工作台，不执行整页刷新。
6. 工作台初始化直接消费 bootstrap 返回的完整状态，不再重复请求摘要、用户和完整状态。

不要重新引入启动阶段的 `/api/auth/me`、`/api/state?summary=1` 或登录后的 `location.reload()`；这些会恢复重复网络往返，并让更新后的冷启动再次变慢。

## 修改与发布链路

1. 按 `docs/APP_MODULES.md` 定位业务文件，只做对应模块修改。
2. 运行该模块的聚焦测试，再运行完整项目检查。
3. 构建并确认仍只生成一个 boot 脚本和一个 workbench 脚本。
4. 在本地 Cloudflare 预览验证桌面端、Windows 关注链路和移动端。
5. 用户确认后执行代码部署。
6. 部署后只读检查 release 与 D1 状态；部署过程不写团队业务数据。

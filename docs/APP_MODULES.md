# 应用模块索引

工作台源码按固定顺序合并为一个生产脚本。模块拆分只改善维护方式，不改变浏览器执行模型、界面、功能或数据。

## 修改位置

| 需求 | 源码文件 | 重点检查 |
| --- | --- | --- |
| 启动、登录恢复、加载耗时 | `src/app/boot.js`、`functions/api/bootstrap.js` | `test-fast-bootstrap.mjs`、`test-auth-flow.mjs` |
| 本地状态、云端增量同步、冲突保护 | `src/app/workbench/00-runtime.js`、`functions/api/state.js` | `test-cloud-initial-load.mjs`、`test-task-sync.mjs` |
| 总览、日期范围、GMV 与图表 | `src/app/workbench/10-overview.js` | `test-gmv-trend-range.mjs` |
| 任务列表、流转、结果与作废 | `src/app/workbench/20-tasks.js` | `test-task-center-views.mjs`、`test-task-sync.mjs` |
| 日报、周报、复查与经营诊断 | `src/app/workbench/30-reports.js` | `test-report-form-disclosure.mjs`、`test-task-sync.mjs` |
| 达人展示、导入、编辑和寄样 | `src/app/workbench/40-creators.js` | `test-creator-import.mjs` |
| 手动经营记录、导入与导出 | `src/app/workbench/50-records.js` | 全量检查 |
| 成本档案、图片与测算 | `src/app/workbench/60-costing.js` | 全量检查与本地交互 |
| 页面导航和运营学院 | `src/app/workbench/70-navigation.js` | 本地页面切换 |
| 表单与全局事件委托 | `src/app/workbench/80-events.js` | 各板块交互回归 |
| 初始化与登录用户应用 | `src/app/workbench/90-entry.js` | 登录恢复和首屏验证 |
| 模块顺序与生产合并 | `scripts/app-sources.mjs`、`scripts/build-cloudflare.mjs` | `test-app-sources.mjs`、`test-app-boundaries.mjs` |

## 依赖方向

```text
00 运行时与云端状态
  ↓
10 总览 → 20 任务 → 30 日报 → 40 达人 → 50 经营记录 → 60 成本
  ↓
70 导航 → 80 事件 → 90 初始化
```

这是执行顺序，不代表所有模块都互相依赖。新代码应放进拥有该业务的文件，不把业务规则放进 `80-events.js` 或 `90-entry.js`。

日报与任务是唯一明确的双向业务关系：日报提交会创建或更新任务，到期任务复查会回到日报。调整其中任一模块时，必须同时运行任务同步、任务中心和日报测试。

## 不可跨越的边界

- 浏览器业务模块不直接执行 D1 SQL，只通过现有 API 同步。
- 构建和部署不初始化、不清空、不覆盖团队数据。
- `00-runtime.js` 负责 revision、增量补丁与状态防回退，其他模块通过 `saveState()` 保存。
- `90-entry.js` 只能组织初始化，不承载新的业务计算。
- 新增源码文件必须登记在 `scripts/app-sources.mjs`，否则不进入生产构建。
- 不直接修改 `dist/`，构建产物始终由源文件生成。

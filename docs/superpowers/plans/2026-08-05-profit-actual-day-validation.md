# 真实单日利润验证实施计划

> 在当前 `cloudflare-migration` 工作树内执行，保留用户已有修改，不单独提交。

## 1. 先锁定口径测试

修改 `scripts/test-profit-template.mjs`，覆盖真实链接、6 个 SKU、经营 GMV、平台确认销售额、实际到手、产品成本、口径差异与费用待补状态。先运行并确认测试因生产代码尚未支持这些字段而失败。

## 2. 接入真实样本

修改 `src/app/workbench/62-profit-repository.js`，将默认演示种子替换为 2026-08-03 的已验证产品、链接和 SKU 数据；保留新增链接、共享 SKU、历史留存等 repository 能力。

## 3. 完善利润领域模型

修改 `src/app/workbench/61-profit-domain.js` 与 `63-profit-selectors.js`，增加平台确认销售额、财务口径差异、暂算利润和费用完整度，确保缺失费用不被静默转换成 0。

## 4. 调整页面语义

修改 `src/app/workbench/65-profit-template.js`，将顶部与利润桥切换为真实数据口径；SKU 改为商品毛利；内部费用未补齐时展示待补和暂算状态。必要时仅在 `src/styles/modules/18-profit-template.css` 增加状态样式，不改变已确认的双栏版式。

## 5. 验证

依次运行利润定向测试、项目全量检查、生产构建，并在 1440px 与窄屏浏览器检查页面、控制台和横向溢出。

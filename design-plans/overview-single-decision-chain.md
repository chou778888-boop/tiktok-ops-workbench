# 将总览收敛为一条经营决策链

Written against: 57603131a5b936066180ec2c98e8a7bce13cd248

## Evidence chain

- Surface: `http://127.0.0.1:52098/` 的总览首屏，以及 `index.html` 中 `#overview`
- Problem: 当前运行版本连续展示“重点链接近7日价量”和“多店近7日GMV”，把链接级诊断放在公司级结果之前；相同周期、相邻趋势图造成重复体验。
- Design evidence: 用户明确要求从跨境电商经营链路出发；`docs/superpowers/specs/2026-08-08-overview-decision-chain-design.md` 已确认“整体结果 → 异常定位 → 链接下钻 → 负责人动作”；`docs/STYLE_SYSTEM.md` 要求总览10秒内呈现核心结果、异常和待办。
- Owner: `index.html` 总览组合；`src/app/workbench/10-overview.js` 渲染与画布；`src/app/workbench/11-overview-pulse-model.js` 纯展示模型；`src/styles/modules/19-premium-shell-overview.css` 最终覆盖。
- Scope and affected surfaces: 总览顶部判断、唯一主趋势区、GMV/链接互斥切换、风险跳转；不改变日报、任务、利润计算与持久化。
- Uncertainty: none。用户已经选择公司级结果优先、链接级按需下钻的方向。

## Design decision

顶部改为公司级经营判断与四项核心指标，不常驻链接趋势。页面保留一个“近7日经营变化”主分析容器，默认展示多店GMV与来源贡献；用户主动切换后，同一容器替换为重点链接价量、实际到手、利润和处理动作。两个分析面板必须互斥，不得在同一滚动位置同时出现。

## Reuse

- 复用现有日期工具栏、`makeOverviewPulseModel`、GMV趋势画布、来源贡献画布、链接利润动作以及总览表格。
- Exemplar: `docs/superpowers/specs/2026-08-08-overview-decision-chain-design.md`
- 新增的公司级判断只进入已有纯模型文件，不新建第二套总览状态体系。

## Changes

1. `src/app/workbench/11-overview-pulse-model.js`
   - Change: 完成 `makeOverviewDecisionModel` 与 `overviewAnalysisVisibility`，明确空数据、稳定、重要和紧急状态。
   - Preserve: 链接价量与利润口径。
   - Verify: 模型测试覆盖公司级判断及两个面板严格互斥。
2. `index.html`、`src/app/workbench/00-runtime.js`、`src/app/workbench/10-overview.js`、`src/app/workbench/80-events.js`
   - Change: 渲染公司级判断；默认模式为 `gmv`；切换按钮只显示一个分析面板；风险按钮滚动到异常摘要；链接按钮仍进入对应利润详情。
   - Preserve: 日期筛选、真实数据、表格、异常识别和保存逻辑。
   - Verify: 首屏DOM中只有一个分析壳；GMV和链接面板切换后分别可见且画布重新绘制。
3. `src/styles/modules/19-premium-shell-overview.css`
   - Change: 删除旧的顶部“focus/pulse”双列语义；公司级判断使用1.15fr/0.85fr；主趋势保持趋势/解释两列；1180px以下单列；390px无页面级横向溢出。
   - Preserve: 石墨绿、浅画布、科技绿和当前表格密度。
   - Verify: 长中文不碎裂，切换控件选中明确，真实7日和14条SKU下高度可控。

## Scope

- Inherit: 总览所有日期范围。
- Verify: 今日、昨日、近7日、指定日期；完整数据、空数据；1200px与390px。
- Exclude: 日报中心、任务中心、利润公式、云端数据模型、正式部署。

## Validation

- Product: 进入总览先读到整体结果和最高优先异常；需要时在同一主趋势区下钻链接并进入利润详情。
- Interface: 点击四类日期、两个分析模式、查看优先风险、处理此链接；检查真实数据、空状态、桌面与移动端。
- System: 继续使用现有总览模型、画布和设计令牌，不保留并行的旧趋势结构。
- Repository: `npm run check && npm run build && git diff --check` → 全部退出码为0。

## Stop conditions

- 如果公司级总览数据无法从现有 `entries/reports` 汇总得到，或需要改动利润持久化模型，立即停止并重新确认范围。

## Design documentation

- After acceptance and validation: 将最终交互与验收截图补充到 `design-qa.md`；不新增另一份方向文档。

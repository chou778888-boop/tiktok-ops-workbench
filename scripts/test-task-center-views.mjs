import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAppSources } from "./app-sources.mjs";

const html = await readFile("index.html", "utf8");
const source = (await loadAppSources()).combined;
const styles = await readFile("src/styles/modules/21-task-command-center.css", "utf8");

for (const [view, label] of [["mine", "我的任务"], ["team", "团队任务"], ["history", "历史任务"]]) {
  assert.match(html, new RegExp(`data-task-view="${view}"[\\s\\S]*?${label}`), `必须提供“${label}”视图入口`);
  assert.match(html, new RegExp(`data-task-panel="${view}"`), `必须提供 ${view} 视图面板`);
}

assert.match(source, /let activeTaskCenterView = "mine";/, "任务中心必须默认显示我的任务");
assert.match(source, /const TASK_HISTORY_PAGE_SIZE = 20;/, "历史任务必须按20条分批显示");
assert.match(source, /function currentTaskCenterAuthor\(\)[\s\S]*signedInWorkbenchUser/, "当前人员必须来自登录姓名");
assert.doesNotMatch(source, /teamButton\.hidden/, "成员和管理员都必须可以进入团队任务");
assert.match(source, /function taskMatchesCurrentAuthor\(task, author\)[\s\S]*normalizedReportAuthor\(task\.assignee\)[\s\S]*normalizedReportAuthor\(author\)/, "我的任务必须精确匹配标准化负责人姓名");
assert.match(source, /function taskCenterActiveTasks\(\)[\s\S]*filter\(taskIsActive\)/, "当前视图必须排除完成和作废任务");
assert.match(source, /function taskCenterHistoryTasks\(\)[\s\S]*filter\(taskIsTerminal\)/, "历史视图必须只包含终态任务");
assert.match(source, /function compareTaskCenterTasks\(a, b\)[\s\S]*isPastDue[\s\S]*taskPriorityRank[\s\S]*due/, "当前任务必须按逾期、优先级和截止时间排序");
assert.match(source, /function groupTasksByAssignee\(tasks\)[\s\S]*未分配/, "团队任务必须包含未分配分组");
assert.match(source, /if \(!author\)[\s\S]*task-identity-empty/, "空姓名必须显示身份提示而不是团队任务");
assert.match(source, /data-task-group-toggle=/, "负责人分组必须可以展开");
assert.match(source, /data-task-history-more/, "历史任务必须提供加载更多操作");
assert.match(source, /data-task-search/, "团队和历史任务必须支持搜索");

for (const selector of ["task-center-nav", "task-identity", "task-summary-grid", "task-assignee-group", "task-center-filters", "task-history-more"]) {
  assert.match(styles, new RegExp(`\\.${selector}`), `任务样式模块必须包含 .${selector}`);
}

assert.match(styles, /#tasks\s*>\s*\.panel[\s\S]*max-width:\s*1420px[\s\S]*margin-inline:\s*auto/, "任务中心必须使用1420px居中行动工作区");
assert.match(styles, /\.task-personal-command[\s\S]*grid-template-columns:\s*minmax\(220px,\s*0\.78fr\)\s+minmax\(0,\s*2\.22fr\)/, "执行人和快捷状态必须在同一行动带内分配空间");
assert.match(styles, /\.task-center-nav[\s\S]*margin:\s*0\s+32px\s+17px/, "三个任务视图入口必须与主工作区左侧对齐");
assert.match(styles, /\.task-empty-state[\s\S]*min-height:\s*0/, "空任务状态必须随内容自然收缩，不能占据大块空白");
assert.match(styles, /\.task-personal-list,[\s\S]*grid-template-columns:\s*1fr/, "行动任务必须使用可展开的单列优先队列");
assert.match(styles, /@media\s*\(max-width:\s*1100px\)[\s\S]*\.task-command-layout\s*\{\s*grid-template-columns:\s*1fr/, "中等屏幕必须将行动队列与闭环记录回落为单列");

console.log(JSON.stringify({ passed: 27, phase: "task-center-scalable-views" }));

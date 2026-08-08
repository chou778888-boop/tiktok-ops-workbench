import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAppSources } from "./app-sources.mjs";

const html = await readFile("index.html", "utf8");
const source = (await loadAppSources()).combined;
const styles = await readFile("src/styles/modules/06-tasks.css", "utf8");

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

assert.match(styles, /#tasks\s*>\s*\.panel[\s\S]*max-width:\s*1260px[\s\S]*margin-inline:\s*auto/, "任务中心必须使用1260px居中内容容器");
assert.match(styles, /\.task-center-panel\[data-task-panel="mine"\][\s\S]*gap:\s*0/, "人员身份和任务统计必须组成连续状态栏");
assert.match(styles, /\.task-center-nav[\s\S]*margin:\s*0\s+28px\s+16px/, "三个任务视图入口必须与内容区左侧对齐");
assert.match(styles, /\.task-personal-list\s*>\s*\.empty[\s\S]*min-height:\s*72px/, "无任务状态必须紧凑展示，不能占据大块空白");
assert.match(styles, /\.task-personal-list,[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, "宽屏任务卡必须使用三列布局");
assert.match(styles, /@media\s*\(max-width:\s*1279px\)[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, "中等屏幕任务卡必须回落为两列");

console.log(JSON.stringify({ passed: 27, phase: "task-center-scalable-views" }));

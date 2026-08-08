import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAppSources } from "./app-sources.mjs";

const html = await readFile("index.html", "utf8");
const source = (await loadAppSources()).combined;
const styles = await readFile("src/styles/modules/02-shell-and-reports.css", "utf8");

const roleSelect = html.match(/<select name="role" id="reportRole">([\s\S]*?)<\/select>/)?.[1] || "";
assert.match(
  roleSelect,
  /<option value="">请选择岗位<\/option>/,
  "日报类型必须默认提供空的“请选择岗位”选项"
);

const detailsStart = html.indexOf('<div class="report-details" id="reportDetails" hidden>');
const detailsEnd = html.indexOf("</form>", detailsStart);
const details = detailsStart >= 0 && detailsEnd > detailsStart ? html.slice(detailsStart, detailsEnd) : "";
assert.ok(details, "红线下方内容必须位于默认隐藏的 #reportDetails 中");
for (const requiredId of ["reportHelp", "reportRoleFields", "reportClosureFields", "reportSaveReceipt", "resetReportForm"]) {
  assert.match(details, new RegExp(`id="${requiredId}"`), `#${requiredId} 必须位于详细填写区`);
}

assert.match(
  styles,
  /\.report-details[^}]*display:\s*contents/s,
  "展开后的详细填写区必须保持现有表单网格布局"
);

assert.match(source, /const reportResumeKey = "tiktok_ops_report_resume_v1";/, "必须使用独立的浏览器恢复键");
assert.match(source, /function setReportFormExpanded\(expanded\)/, "必须由统一函数控制详细填写区");
assert.match(source, /details\.hidden = !expanded/, "展开控制必须同步 hidden 状态");
assert.match(source, /function saveReportResumePointer\(report\)/, "保存成功后必须记录恢复指针");
assert.match(source, /date: report\.date[\s\S]*role: report\.role[\s\S]*author: normalizedReportAuthor\(report\.author\)[\s\S]*reportId: report\.id/, "恢复指针必须绑定日期、岗位、填写人和日报 ID");
assert.match(source, /function clearReportResumePointer\(\)[\s\S]*localStorage\.removeItem\(reportResumeKey\)/, "清空必须移除恢复指针");
assert.match(source, /function restoreReportFormForToday\(\)[\s\S]*pointer\.date !== today[\s\S]*clearReportResumePointer\(\)/, "跨日恢复记录必须失效");
assert.match(source, /document\.getElementById\("reportRole"\)\.addEventListener\("change",[\s\S]*setReportFormExpanded\(Boolean\(role\)\)/, "岗位变化必须控制展开状态");
assert.match(source, /function editTodayReport\(reportId\)[\s\S]*setReportFormExpanded\(true\)/, "编辑本人今日日报必须展开详细区");
assert.match(source, /function loadReportIntoForm\(report,[\s\S]*fillReportRoleData\(report\)[\s\S]*fillReportClosureData\(report\)[\s\S]*renderReportWorkGuide\(\)/, "编辑回填完成后必须重新计算提交准备状态");
assert.match(source, /saveReportResumePointer\(report\)/, "成功保存必须更新恢复指针");
assert.match(source, /const preservedDate = form\.elements\.date\.value \|\| today[\s\S]*const preservedRole = form\.elements\.role\.value[\s\S]*const preservedAuthor = currentReportAuthor\(\)[\s\S]*form\.elements\.author\.value = preservedAuthor/, "清空岗位内容时必须保留日期、岗位和当前登录人");
assert.match(source, /const submissionText = submissionCoverage\.target[\s\S]*\$\{reports\.length\} 份日报/, "多人提交时摘要必须显示日报份数，不能把人员份数写成岗位完成分数");
assert.doesNotMatch(source, /\$\{reports\.length\}\/\$\{submissionCoverage\.target\} 份/, "日报摘要不得出现 12\/4 份一类错误口径");
assert.match(source, /const highRiskReports = submittedReports\.filter[\s\S]*highRiskReports\.length[\s\S]*上报高风险/, "经营重点必须识别岗位上报的高风险，不能只看SPS和逾期任务");
assert.match(source, /data-report-key="sps"[^>]*step="0\.01"/, "SPS评分必须允许平台常见的两位小数输入");

console.log(JSON.stringify({ passed: 24, phase: "report-form-progressive-disclosure" }));

export { html, source, styles };

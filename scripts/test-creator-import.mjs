import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { loadAppSources } from "./app-sources.mjs";

const source = (await loadAppSources()).combined;
const start = source.indexOf("const creatorImportHeaderMap");
const end = source.indexOf("function parseCreatorCsv", start);
assert.ok(start >= 0 && end > start, "必须能载入真实达人导入表头解析逻辑");

const context = {};
vm.runInNewContext(`${source.slice(start, end)}\nthis.resolveCreatorHeader = (value) => creatorImportHeaderMap.get(normalizedCreatorImportHeader(value)) || "";`, context);

for (const header of ["达人产品", "寄样产品", "产品", "SKU", "产品 SKU"]) {
  assert.equal(context.resolveCreatorHeader(header), "product", `${header}必须统一写入达人产品字段`);
}

const elements = new Map();
const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, { innerHTML: "", textContent: "", disabled: false }); return elements.get(id); } };
const previewStart = source.indexOf("function renderCreatorImportPreview");
const previewEnd = source.indexOf("function closeCreatorImportPreview", previewStart);
const previewContext = { document, escapeHtml: String, num: String };
vm.runInNewContext(`${source.slice(previewStart, previewEnd)}\nthis.renderPreview = renderCreatorImportPreview;`, previewContext);
previewContext.renderPreview([{
  rowNumber: 2,
  record: { name: "测试达人", creatorHandle: "test", source: "毛毯项目", tier: "普通达人", levelTag: "", categoryTag: "", shop: "DreamWeave", product: "毛毯", samples: [{ sku: "BL-01" }] },
  owner: "邱诗语",
  valid: true,
  reason: "可导入"
}], "test.xlsx");
const previewHtml = elements.get("creatorImportPreview").innerHTML;
assert.match(previewHtml, /毛毯/, "导入预览必须显示达人产品");
assert.match(previewHtml, /BL-01/, "导入预览必须显示SKU");

console.log(JSON.stringify({ passed: 7, phase: "creator-import-product-aliases" }));

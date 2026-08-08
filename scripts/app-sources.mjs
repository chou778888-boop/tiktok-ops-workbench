import { readFile } from "node:fs/promises";

export const appSourceFiles = [
  "src/app/workbench/00-runtime.js",
  "src/app/workbench/10-overview.js",
  "src/app/workbench/11-overview-pulse-model.js",
  "src/app/workbench/20-tasks.js",
  "src/app/workbench/30-reports.js",
  "src/app/workbench/40-creators.js",
  "src/app/workbench/50-records.js",
  "src/app/workbench/60-costing.js",
  "src/app/workbench/61-profit-domain.js",
  "src/app/workbench/62-profit-repository.js",
  "src/app/workbench/63-profit-selectors.js",
  "src/app/workbench/65-profit-template.js",
  "src/app/workbench/70-navigation.js",
  "src/app/workbench/80-events.js",
  "src/app/workbench/90-entry.js"
];

export async function loadAppSources() {
  const sources = await Promise.all(appSourceFiles.map((file) => readFile(file, "utf8")));
  return { files: [...appSourceFiles], combined: sources.join("") };
}

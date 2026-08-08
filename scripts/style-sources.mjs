import { dirname, relative, resolve } from "node:path";
import { readFile } from "node:fs/promises";

const IMPORT_PATTERN = /^\s*@import\s+url\(["'](.+?)["']\);\s*$/gm;

export async function loadStyleSources(entry = "src/styles/workbench.css") {
  const entryText = await readFile(entry, "utf8");
  const entryDirectory = dirname(entry);
  const importPaths = [...entryText.matchAll(IMPORT_PATTERN)].map((match) => match[1]);

  if (!importPaths.length) {
    throw new Error(`No ordered CSS modules found in ${entry}`);
  }
  if (new Set(importPaths).size !== importPaths.length) {
    throw new Error(`Duplicate CSS modules found in ${entry}`);
  }

  const manifestRemainder = entryText
    .replace(IMPORT_PATTERN, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
  if (manifestRemainder) {
    throw new Error(`${entry} must contain only ordered @import rules`);
  }

  const files = importPaths.map((importPath) => {
    const file = resolve(entryDirectory, importPath);
    const projectRelative = relative(process.cwd(), file);
    if (projectRelative.startsWith("..")) {
      throw new Error(`CSS module escapes the project: ${importPath}`);
    }
    return projectRelative;
  });
  const sources = await Promise.all(files.map((file) => readFile(file, "utf8")));

  return {
    entry,
    entryText,
    files,
    sources,
    combined: sources.join("")
  };
}

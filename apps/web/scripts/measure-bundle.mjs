// Bundle budgets from docs/plans/2026-10-project-review/05-performance-and-robustness-plan.md §2.1.
// Node built-ins only, so every machine reports the same numbers without a visualizer dependency.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const distDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const assetsDirectory = join(distDirectory, "assets");
const LARGEST_LAZY_CHUNK_COUNT = 12;

function measure(fileName) {
  const content = readFileSync(join(assetsDirectory, fileName));
  return { fileName, raw: content.length, gzip: gzipSync(content, { level: 9 }).length };
}

function kilobytes(bytes) {
  return (bytes / 1000).toFixed(1);
}

function assetNames(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1].replace(/^\/?assets\//, ""));
}

const html = readFileSync(join(distDirectory, "index.html"), "utf8");
const entryScripts = assetNames(html, /<script[^>]+type="module"[^>]+src="([^"]+)"/g);
const preloads = assetNames(html, /<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g);
const entryStyles = assetNames(html, /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g);
const eagerFiles = [...new Set([...entryScripts, ...preloads, ...entryStyles])];
const eager = eagerFiles.map(measure);
const allAssets = readdirSync(assetsDirectory).filter(
  (name) => name.endsWith(".js") || name.endsWith(".css"),
);
const lazyChunks = allAssets
  .filter((name) => name.endsWith(".js") && !eagerFiles.includes(name))
  .map(measure)
  .sort((left, right) => right.gzip - left.gzip)
  .slice(0, LARGEST_LAZY_CHUNK_COUNT);
const largestCss = allAssets
  .filter((name) => name.endsWith(".css"))
  .map(measure)
  .sort((left, right) => right.raw - left.raw)[0];
const entry = measure(entryScripts[0]);
const eagerRaw = eager.reduce((sum, file) => sum + file.raw, 0);
const eagerGzip = eager.reduce((sum, file) => sum + file.gzip, 0);
const hasEagerMotion = eagerFiles.some((name) => name.startsWith("vendor-motion"));
const hasZodChunk = allAssets.some((name) => name.startsWith("vendor-zod"));

console.log("Eager home path");
for (const file of eager) {
  console.log(`  ${file.fileName}  ${kilobytes(file.raw)} kB raw  ${kilobytes(file.gzip)} kB gzip`);
}
console.log(`  total  ${kilobytes(eagerRaw)} kB raw  ${kilobytes(eagerGzip)} kB gzip`);
console.log(`\nLargest ${LARGEST_LAZY_CHUNK_COUNT} lazy chunks`);
for (const file of lazyChunks) {
  console.log(`  ${file.fileName}  ${kilobytes(file.raw)} kB raw  ${kilobytes(file.gzip)} kB gzip`);
}
console.log("\nBudget row");
console.log(`  eager path gzip       ${kilobytes(eagerGzip)} kB (gate <= 110)`);
console.log(`  entry chunk raw       ${kilobytes(entry.raw)} kB (gate <= 100)`);
console.log(`  vendor-motion eager   ${hasEagerMotion ? "yes" : "no"} (gate: no)`);
console.log(`  vendor-zod emitted    ${hasZodChunk ? "yes" : "no"} (gate: no)`);
console.log(
  `  largest CSS raw       ${kilobytes(largestCss.raw)} kB ${largestCss.fileName} (gate <= 20)`,
);

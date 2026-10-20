import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 06-structure-and-test-plan.md T11: each browser project must finish within four minutes.
const BUDGET_MS = 4 * 60_000;
const resultsPath = fileURLToPath(new URL("../test-results/e2e-results.json", import.meta.url));

function* walkSuites(suites) {
  for (const suite of suites ?? []) {
    yield* suite.specs ?? [];
    yield* walkSuites(suite.suites);
  }
}

function sumDurationsByProject(report) {
  const durations = new Map();
  for (const spec of walkSuites(report.suites)) {
    for (const test of spec.tests) {
      const spent = test.results.reduce((total, result) => total + result.duration, 0);
      durations.set(test.projectName, (durations.get(test.projectName) ?? 0) + spent);
    }
  }
  return durations;
}

const report = JSON.parse(readFileSync(resultsPath, "utf8"));
const durations = sumDurationsByProject(report);
const overBudget = [...durations].filter(([, duration]) => duration > BUDGET_MS);

for (const [project, duration] of durations) {
  console.log(`${project.padEnd(10)} ${(duration / 1_000).toFixed(1).padStart(6)} s`);
}
console.log(`wall clock ${(report.stats.duration / 1_000).toFixed(1).padStart(6)} s`);

if (overBudget.length > 0) {
  for (const [project, duration] of overBudget) {
    console.error(
      `${project} took ${(duration / 1_000).toFixed(1)} s, over the ${BUDGET_MS / 1_000} s budget.`,
    );
  }
  process.exit(1);
}

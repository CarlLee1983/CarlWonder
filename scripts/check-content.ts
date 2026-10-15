// 內容檢查：node --experimental-strip-types scripts/check-content.ts
// 篇章目錄由 CHAPTERS_DIR 決定（同內容集合），研究紀錄目錄由 RESEARCH_DIR 決定；預設見 content-dir.ts。
import {
  resolveChaptersDir,
  resolveResearchDir,
} from "../src/content/content-dir.ts";
import type { Issue } from "../src/content-checks/issue.ts";
import { formatReport } from "../src/content-checks/report.ts";
import { runContentChecks } from "../src/content-checks/run.ts";

const warnings: Issue[] = [];
const issues = await runContentChecks({
  chaptersDir: resolveChaptersDir(),
  researchDir: resolveResearchDir(),
  onWarning: (warning) => warnings.push(warning),
});

const report = formatReport(issues, warnings);
for (const line of report.stdout) console.log(line);
for (const line of report.stderr) console.error(line);
process.exitCode = report.exitCode;

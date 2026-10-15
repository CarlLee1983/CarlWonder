import { formatIssue, type Issue } from "./issue.ts";

export interface Report {
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

/** 把檢查結果整理成輸出與結束碼：只有硬性問題讓結束碼非零，警告只提示。 */
export function formatReport(issues: Issue[], warnings: Issue[]): Report {
  const stdout: string[] = [];
  const stderr: string[] = [];
  if (warnings.length > 0) {
    stderr.push(`內容檢查警告，共 ${warnings.length} 項（不影響結果）：`);
    for (const warning of warnings) stderr.push(`- ${formatIssue(warning)}`);
  }
  if (issues.length === 0) {
    stdout.push("內容檢查通過。");
    return { exitCode: 0, stdout, stderr };
  }
  stderr.push(`內容檢查失敗，共 ${issues.length} 項問題：`);
  for (const issue of issues) stderr.push(`- ${formatIssue(issue)}`);
  return { exitCode: 1, stdout, stderr };
}

/** 一項檢查發現：要讓人知道是哪個檔案、為什麼。 */
export interface Issue {
  file: string;
  message: string;
}

/** 單行輸出：`檔案: 說明`。 */
export function formatIssue(issue: Issue): string {
  return `${issue.file}: ${issue.message}`;
}

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// WCAG 2.2 AA。axe 的標籤是累加的，所以 2.0、2.1、2.2 的 A／AA 都要列。
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** 以目前頁面狀態掃描；有違規時把規則、說明與節點列在失敗訊息裡。 */
export async function expectNoAxeViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  const report = violations.map(
    (v) =>
      `${v.id}（${v.impact}）：${v.help}\n` +
      v.nodes.map((n) => `  ${n.target.join(" ")}`).join("\n"),
  );
  expect(report, `${label} 的 axe 違規`).toEqual([]);
}

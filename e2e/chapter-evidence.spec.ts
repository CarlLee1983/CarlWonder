import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./a11y-helpers";

// 期望值取自 tests/fixtures/chapters/sample-chapter/chapter.md 的字面值。
const PATH = "/chapters/sample-chapter/";

// 證據說明各列：等級標籤、主張、參考資料編號（依 references 清單順序）。
const NOTES = [
  {
    level: "已知",
    claim: "鐘樓蓋在突出海面的岩石上，石牆厚達一公尺",
    refs: ["〔1〕"],
  },
  {
    level: "已知",
    claim: "機房裡有直徑約兩公尺、邊緣綁著陶罐的木輪",
    refs: ["〔1〕", "〔3〕"],
  },
  { level: "推論", claim: "空氣流動推動木輪，再撥動木槌敲鐘", refs: ["〔2〕"] },
  { level: "推論", claim: "響鐘的節奏與月相有關", refs: ["〔2〕", "〔4〕"] },
  { level: "傳說", claim: "隱居鐘匠留下永不停止的機器", refs: ["〔4〕"] },
  { level: "未知", claim: "岩石底下的洞穴有多大", refs: [] },
];

const REFERENCES = [
  {
    key: "bell-log",
    text: /霧港鎮公所.*1893.*霧港鐘樓管鐘日誌（影印本）.*霧港鎮立圖書館.*https:\/\/example\.com\/library\/bell-log.*2026-01-10/s,
    url: "https://example.com/library/bell-log",
  },
  {
    key: "tide-table",
    text: /測試海洋研究所.*2019.*霧港潮汐觀測年報.*測試海洋研究所.*https:\/\/example\.com\/ocean\/tide-table.*2026-01-12/s,
    url: "https://example.com/ocean/tide-table",
  },
  {
    key: "harbor-survey",
    text: /丁工程師.*公元前 54 年.*鐘樓機房測量紀錄.*測試工程學會期刊.*https:\/\/example\.com\/journal\/harbor-survey.*2026-01-15/s,
    url: "https://example.com/journal/harbor-survey",
  },
  {
    key: "keeper-oral-history",
    text: /戊口述史小組.*2021.*歷任管鐘人口述訪談集.*霧港文化協會.*https:\/\/example\.com\/culture\/keeper-oral-history.*2026-01-18/s,
    url: "https://example.com/culture/keeper-oral-history",
  },
];

test.describe("證據說明", () => {
  test("每列顯示等級標籤、主張與參考資料編號", async ({ page }) => {
    await page.goto(PATH);
    await expect(
      page.getByRole("heading", { level: 2, name: "證據說明" }),
    ).toBeVisible();
    const rows = page.locator("#evidence-notes li");
    await expect(rows).toHaveCount(NOTES.length);
    for (const [index, note] of NOTES.entries()) {
      const row = rows.nth(index);
      await expect(row.locator(".evidence-note__level")).toHaveText(note.level);
      await expect(row.locator(".evidence-note__claim")).toHaveText(note.claim);
      await expect(row.getByRole("link")).toHaveText(note.refs);
      for (const [i, mark] of note.refs.entries()) {
        await expect(row.getByRole("link").nth(i)).toHaveAttribute(
          "aria-label",
          `參考資料 ${mark.slice(1, -1)}`,
        );
      }
    }
  });

  test("點編號到達對應的參考資料", async ({ page }) => {
    await page.goto(PATH);
    await page
      .locator("#evidence-notes li")
      .nth(1)
      .getByRole("link", { name: "參考資料 3" })
      .click();
    await expect(page).toHaveURL(/#ref-harbor-survey$/);
    const target = page.locator("#ref-harbor-survey");
    await expect(target).toBeVisible();
    await expect(target).toContainText("鐘樓機房測量紀錄");
    await expect(target).toBeInViewport();
  });

  test("想像圖圖說的編號連到對應的參考資料", async ({ page }) => {
    await page.goto(PATH);
    const caption = page
      .locator("figure")
      .filter({ hasText: "依據：地方誌" })
      .locator("figcaption");
    for (const [i, n] of [1, 2].entries()) {
      await expect(caption.getByRole("link").nth(i)).toHaveAttribute(
        "aria-label",
        `參考資料 ${n}`,
      );
    }
    await caption.getByRole("link", { name: "參考資料 2" }).click();
    await expect(page).toHaveURL(/#ref-tide-table$/);
    await expect(page.locator("#ref-tide-table")).toBeVisible();
  });
});

test.describe("參考資料", () => {
  test("編號清單依 frontmatter 順序，每條依序列出六項資訊", async ({
    page,
  }) => {
    await page.goto(PATH);
    await expect(
      page.getByRole("heading", { level: 2, name: "參考資料" }),
    ).toBeVisible();
    const items = page.locator("ol#references > li");
    await expect(items).toHaveCount(REFERENCES.length);
    for (const [index, reference] of REFERENCES.entries()) {
      const item = items.nth(index);
      await expect(item).toHaveAttribute("id", `ref-${reference.key}`);
      await expect(item).toHaveText(reference.text);
      await expect(item.getByRole("link")).toHaveAttribute(
        "href",
        reference.url,
      );
    }
  });

  test("最後查核日期在清單之後", async ({ page }) => {
    await page.goto(PATH);
    const last = page.getByText("最後查核：2026-01-20", { exact: true });
    await expect(last).toBeVisible();
    const list = (await page.locator("ol#references").boundingBox())!;
    const lastBox = (await last.boundingBox())!;
    expect(lastBox.y).toBeGreaterThanOrEqual(list.y + list.height);
  });

  test("區段順序：正文、證據說明、參考資料", async ({ page }) => {
    await page.goto(PATH);
    const y = async (name: string) =>
      (await page
        .getByRole("heading", { level: 2, name, exact: true })
        .boundingBox())!.y;
    const unknown = await y("還不知道的事");
    const evidence = await y("證據說明");
    const references = await y("參考資料");
    expect(unknown).toBeLessThan(evidence);
    expect(evidence).toBeLessThan(references);
  });
});

for (const [name, width, height] of [
  ["窄螢幕", 390, 844],
  ["寬螢幕", 1280, 900],
] as const) {
  test.describe(name, () => {
    test.use({ viewport: { width, height } });

    test("沒有水平捲動", async ({ page }) => {
      await page.goto(PATH);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("無 axe 違規", async ({ page }) => {
      await page.goto(PATH);
      await expectNoAxeViolations(page, `${name}篇章頁`);
    });
  });
}

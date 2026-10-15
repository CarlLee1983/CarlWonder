import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./a11y-helpers";

// 期望值取自 tests/fixtures/chapters/sample-chapter/chapter.md 的字面值。
const PATH = "/chapters/sample-chapter/";

const figureOf = (page: Page, alt: string) =>
  page.locator("figure", { has: page.getByRole("img", { name: alt }) });

const TOWER_ALT = "霧港鐘樓的外觀，灰白石牆上有四扇狹窄的窗";
const WHEEL_ALT = "研究重建：竹管連著綁有陶罐的木輪的剖面圖";
const REPLICA_ALT = "複製品：木輪邊緣綁著空心陶罐的小型模型";
const IMAGINED_ALT = "想像圖：清晨霧港碼頭與鐘樓的水彩風格插畫";

test.describe("圖片類型膠囊", () => {
  test("非實物照片有對應膠囊，實物照片沒有", async ({ page }) => {
    await page.goto(PATH);
    await expect(
      figureOf(page, WHEEL_ALT).getByText("研究重建", { exact: true }),
    ).toBeVisible();
    await expect(
      figureOf(page, REPLICA_ALT).getByText("複製品", { exact: true }),
    ).toBeVisible();
    await expect(
      figureOf(page, IMAGINED_ALT).getByText("想像圖", { exact: true }),
    ).toBeVisible();
    await expect(
      figureOf(page, TOWER_ALT).getByText(/^(研究重建|複製品|想像圖)$/),
    ).toHaveCount(0);
  });

  test("膠囊疊在圖片左上角", async ({ page }) => {
    await page.goto(PATH);
    const figure = figureOf(page, IMAGINED_ALT);
    const image = (await figure.getByRole("img").boundingBox())!;
    const badge = (await figure
      .getByText("想像圖", { exact: true })
      .boundingBox())!;
    expect(badge.x).toBeGreaterThanOrEqual(image.x);
    expect(badge.y).toBeGreaterThanOrEqual(image.y);
    expect(badge.x - image.x).toBeLessThan(image.width / 3);
    expect(badge.y - image.y).toBeLessThan(image.height / 3);
  });
});

test.describe("圖說", () => {
  test("想像圖的圖說是固定句型，帶參考資料編號", async ({ page }) => {
    await page.goto(PATH);
    await expect(figureOf(page, IMAGINED_ALT).locator("figcaption")).toHaveText(
      "依據：地方誌記載鐘樓建於風暴之後，日誌記下每日的響鐘時刻〔1〕〔2〕。想像部分：碼頭上的人群、漁船的數量與霧的濃淡都是想像。",
    );
  });

  test("非自製圖末行的作者與授權是連結，裁切的加註", async ({ page }) => {
    await page.goto(PATH);
    const tower = figureOf(page, TOWER_ALT);
    await expect(tower.locator("figcaption")).toContainText(
      "霧港鐘樓的外觀，石牆厚達一公尺。",
    );
    await expect(tower.locator("figcaption")).toContainText(
      "照片：測試攝影者甲，CC0 1.0",
    );
    await expect(
      tower.getByRole("link", { name: "測試攝影者甲" }),
    ).toHaveAttribute("href", "https://example.com/files/bell-tower-photo");
    await expect(tower.getByRole("link", { name: "CC0 1.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/publicdomain/zero/1.0/",
    );
    await expect(tower.getByText("經裁切")).toHaveCount(0);

    const wheel = figureOf(page, WHEEL_ALT);
    await expect(wheel.locator("figcaption")).toContainText(
      "照片：測試研究團隊乙，CC BY-NC 3.0（經裁切）",
    );
    await expect(
      wheel.getByRole("link", { name: "CC BY-NC 3.0" }),
    ).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-nc/3.0/",
    );
  });

  test("想像圖沒有出處連結，只有參考資料編號的站內連結", async ({ page }) => {
    await page.goto(PATH);
    const links = figureOf(page, IMAGINED_ALT).getByRole("link");
    await expect(links).toHaveText(["〔1〕", "〔2〕"]);
    await expect(links.nth(0)).toHaveAttribute("href", "#ref-bell-log");
    await expect(links.nth(1)).toHaveAttribute("href", "#ref-tide-table");
    await expect(figureOf(page, IMAGINED_ALT).getByText("照片：")).toHaveCount(
      0,
    );
  });
});

// 每張圖所屬的段落，與緊接其後的下一段（取開頭的字面值）。
const PLACEMENT = [
  {
    alt: TOWER_ALT,
    own: "清晨五點，霧港的碼頭",
    next: "鐘樓建在一塊突出海面的岩石",
  },
  {
    alt: WHEEL_ALT,
    own: "工程師在第二天爬上了鐘樓",
    next: "機房的牆上掛著一塊木板",
  },
  {
    alt: REPLICA_ALT,
    // 與研究重建圖接連跟在同一段後面。
    own: "工程師在第二天爬上了鐘樓",
    next: "機房的牆上掛著一塊木板",
    after: WHEEL_ALT,
  },
  { alt: IMAGINED_ALT, own: "月相與潮汐有關", next: "核對的結果是部分吻合" },
];

test.describe("窄螢幕", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("每張圖在所屬段落之後、下一段之前", async ({ page }) => {
    await page.goto(PATH);
    for (const { alt, own, next } of PLACEMENT) {
      const figure = (await figureOf(page, alt).boundingBox())!;
      const ownBox = (await page
        .locator("p", { hasText: own })
        .first()
        .boundingBox())!;
      const nextBox = (await page
        .locator("p", { hasText: next })
        .first()
        .boundingBox())!;
      expect(ownBox.y + ownBox.height, alt).toBeLessThanOrEqual(figure.y);
      expect(figure.y + figure.height, alt).toBeLessThanOrEqual(nextBox.y);
      expect(figure.x + figure.width, alt).toBeLessThanOrEqual(390);
    }
  });

  test("無 axe 違規", async ({ page }) => {
    await page.goto(PATH);
    await expectNoAxeViolations(page, "窄螢幕篇章頁");
  });
});

test.describe("寬螢幕", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("正文欄約 640 px，圖片在右側旁欄並與所屬段落齊頭", async ({ page }) => {
    await page.goto(PATH);
    for (const { alt, own, after } of PLACEMENT) {
      const figure = (await figureOf(page, alt).boundingBox())!;
      const ownBox = (await page
        .locator("p", { hasText: own })
        .first()
        .boundingBox())!;
      expect(ownBox.width, alt).toBeCloseTo(640, 0);
      expect(figure.x, alt).toBeGreaterThanOrEqual(ownBox.x + ownBox.width);
      expect(figure.x + figure.width, alt).toBeLessThanOrEqual(1280);
      if (after) {
        const above = (await figureOf(page, after).boundingBox())!;
        expect(figure.x, alt).toBe(above.x);
        expect(figure.y, alt).toBeGreaterThanOrEqual(above.y + above.height);
      } else {
        expect(Math.abs(figure.y - ownBox.y), alt).toBeLessThanOrEqual(2);
      }
    }
  });

  test("無 axe 違規", async ({ page }) => {
    await page.goto(PATH);
    await expectNoAxeViolations(page, "寬螢幕篇章頁");
  });
});

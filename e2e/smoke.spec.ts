import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./a11y-helpers";

test("固定資料篇章頁載入並顯示標題、摘要與正文", async ({ page }) => {
  await page.goto("/chapters/sample-chapter/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "範例篇章：固定資料的測試題材",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("這是一篇只給測試使用的固定資料篇章摘要。"),
  ).toBeVisible();
  await expect(page.getByText("這是固定資料篇章的第一段正文")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-TW");
});

test("首頁列出非草稿篇章、不列草稿，並能點進篇章頁", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: /範例篇章：固定資料的測試題材/ });
  await expect(link).toBeVisible();
  await expect(page.getByText("草稿範例")).toHaveCount(0);

  await link.click();
  await expect(page).toHaveURL(/\/chapters\/sample-chapter\/$/);
});

test("草稿篇章網址在正式建置回 404", async ({ page }) => {
  const response = await page.goto("/chapters/draft-sample/");
  expect(response?.status()).toBe(404);
});

test("首頁與篇章頁無 axe 違規", async ({ page }) => {
  await page.goto("/");
  await expectNoAxeViolations(page, "首頁");
  await page.goto("/chapters/sample-chapter/");
  await expectNoAxeViolations(page, "篇章頁");
});

test("首頁在手機與平板不橫向溢出，鍵盤可跳至主要內容", async ({ page }) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳至主要內容" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

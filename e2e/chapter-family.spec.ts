import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./a11y-helpers";

// 期望值取自 tests/fixtures/chapters/sample-chapter 的字面值：
// 正文 3,288 字 → 3288 / 400 = 8.22 → 約 9 分鐘；
// 故事開場 482 字 → 482 / 175 = 2.75 → 3 分鐘，3 + 5（看照片聊一聊）+ 20（活動）= 約 28 分鐘。
const PATH = "/chapters/sample-chapter/";
const ANCHOR_ALT = "霧港鐘樓的外觀，灰白石牆上有四扇狹窄的窗";

const family = (page: Page) => page.locator("#family");
const fontSize = (locator: ReturnType<Page["locator"]>) =>
  locator.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

test.describe("雙入口首屏", () => {
  test("兩扇門的文案與時間", async ({ page }) => {
    await page.goto(PATH);
    const adult = page.getByRole("link", { name: /^給大人：深入正文/ });
    const parent = page.getByRole("link", {
      name: /^給家長與 6–10 歲的孩子：親子共學/,
    });
    await expect(adult).toContainText("約 9 分鐘");
    await expect(parent).toContainText("約 28 分鐘");
  });

  test("點擊後跳到對應區段", async ({ page }) => {
    await page.goto(PATH);
    await page.getByRole("link", { name: /^給家長與 6–10 歲/ }).click();
    await expect(page).toHaveURL(/#family$/);
    await expect(page.locator("#family")).toBeInViewport();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("link", { name: /^給大人：深入正文/ }).click();
    await expect(page).toHaveURL(/#reading$/);
    await expect(page.locator("#reading")).toBeInViewport();
  });

  test("寬螢幕並排、窄螢幕上下排", async ({ page }) => {
    const boxes = async () => ({
      adult: (await page.getByRole("link", { name: /^給大人/ }).boundingBox())!,
      parent: (await page
        .getByRole("link", { name: /^給家長與/ })
        .boundingBox())!,
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(PATH);
    let { adult, parent } = await boxes();
    expect(parent.x).toBeGreaterThan(adult.x + adult.width - 1);
    expect(parent.y).toBeCloseTo(adult.y, 0);

    await page.setViewportSize({ width: 375, height: 800 });
    ({ adult, parent } = await boxes());
    expect(parent.y).toBeGreaterThan(adult.y + adult.height - 1);
  });
});

test.describe("親子共學區段", () => {
  test("先列三步驟，再排三張卡片", async ({ page }) => {
    await page.goto(PATH);
    const section = family(page);
    await expect(
      section.getByRole("heading", { name: "親子共學" }),
    ).toBeVisible();
    const steps = section.locator("ol").first().getByRole("listitem");
    await expect(steps).toHaveText([
      "① 唸故事 3 分鐘",
      "② 看照片聊一聊 5 分鐘",
      "③ 動手做 20 分鐘",
    ]);
    for (const name of ["故事開場", "觀察提問", "家庭探索活動"]) {
      await expect(
        section.getByRole("heading", { level: 3, name }),
      ).toBeVisible();
    }
  });

  test("故事開場卡顯示 story.md 的內文", async ({ page }) => {
    await page.goto(PATH);
    await expect(
      page
        .locator(".story-card__text")
        .getByText("很久很久以前，海邊有一座小小的鎮，叫做霧港。", {
          exact: false,
        }),
    ).toBeVisible();
    await expect(page.locator(".story-card__text p")).toHaveCount(6);
  });

  test("暖色底鋪滿整區的寬度", async ({ page }) => {
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(PATH);
      const background = await family(page).evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      expect(background).toBe("rgb(242, 223, 174)");
      const box = (await family(page).boundingBox())!;
      expect(box.x).toBe(0);
      expect(box.width).toBe(width);
    }
  });

  test("不出現任何證據等級名稱", async ({ page }) => {
    await page.goto(PATH);
    const text = await family(page).evaluate((el) => el.textContent ?? "");
    for (const word of ["已知", "推論", "傳說", "未知"]) {
      expect(text).not.toContain(word);
    }
  });
});

test.describe("朗讀模式", () => {
  test("開啟後全螢幕、字放大；Esc 關閉並把焦點還給按鈕", async ({ page }) => {
    await page.goto(PATH);
    const dialog = page.getByRole("dialog", { name: "故事開場" });
    await expect(dialog).toBeHidden();
    const button = page.getByRole("button", { name: "朗讀模式" });
    await button.click();
    await expect(dialog).toBeVisible();

    const box = (await dialog.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
    expect(await fontSize(dialog.locator("p").first())).toBeGreaterThan(
      await fontSize(page.locator(".story-card__text p").first()),
    );
    await expect(
      dialog.getByText("很久很久以前，海邊有一座小小的鎮", { exact: false }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("關閉按鈕也能關閉並把焦點還給按鈕", async ({ page }) => {
    await page.goto(PATH);
    const button = page.getByRole("button", { name: "朗讀模式" });
    await button.click();
    await page.getByRole("button", { name: "關閉朗讀模式" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(button).toBeFocused();
  });
});

test.describe("觀察提問卡", () => {
  test("錨點圖與正文是同一個圖檔、alt 一致", async ({ page }) => {
    await page.goto(PATH);
    const inCard = family(page).getByRole("img", { name: ANCHOR_ALT });
    const inBody = page.locator("#reading").getByRole("img", {
      name: ANCHOR_ALT,
    });
    await expect(inCard).toBeVisible();
    expect(await inCard.getAttribute("alt")).toBe(
      await inBody.getAttribute("alt"),
    );
    // 兩處都是同一個來源檔（輸出檔名帶同一個雜湊前綴）。
    const stem = (src: string | null) =>
      /bell-tower-photo\.[\w-]+?_/.exec(src ?? "")?.[0];
    expect(stem(await inCard.getAttribute("src"))).toBe(
      stem(await inBody.getAttribute("src")),
    );
    expect(stem(await inCard.getAttribute("src"))).toBeDefined();
  });

  test("看到／覺得／好奇三格：基本題在上、延伸題在下", async ({ page }) => {
    await page.goto(PATH);
    const cells = [
      {
        label: "看到",
        basic: "照片裡的鐘樓有幾扇窗？它們是什麼形狀？",
        older: "石牆看起來有多厚？你是從哪裡看出來的？",
      },
      {
        label: "覺得",
        basic: "你猜鐘樓為什麼只開這麼小的窗？",
        older: "如果要讓船在霧裡找得到方向，窗開在哪裡最有用？",
      },
      {
        label: "好奇",
        basic: "看著這座鐘樓，你還想知道什麼？",
        older: "要怎麼做，才能知道岩石底下到底有什麼？",
      },
    ];
    for (const cell of cells) {
      const section = family(page).locator("section.cell", {
        has: page.getByRole("heading", { name: cell.label }),
      });
      const basic = section.getByText(cell.basic);
      const older = section.getByText(`大一點的孩子：${cell.older}`);
      await expect(basic).toBeVisible();
      await expect(older).toBeVisible();
      const [basicBox, olderBox] = [
        (await basic.boundingBox())!,
        (await older.boundingBox())!,
      ];
      expect(olderBox.y).toBeGreaterThan(basicBox.y);
    }
  });

  test("錨點圖的出處行與正文圖說同一個格式", async ({ page }) => {
    await page.goto(PATH);
    const credit = page.locator(".observation-card__credit");
    await expect(credit).toHaveText("照片：測試攝影者甲，CC0 1.0");
    await expect(
      credit.getByRole("link", { name: "測試攝影者甲" }),
    ).toHaveAttribute("href", "https://example.com/files/bell-tower-photo");
    await expect(credit.getByRole("link", { name: "CC0 1.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/publicdomain/zero/1.0/",
    );
  });

  test("家長提示在卡片底部", async ({ page }) => {
    await page.goto(PATH);
    const card = page.locator(".observation-card");
    const tips = card.locator(".observation-card__tips");
    await expect(tips.getByRole("heading", { name: "家長提示" })).toBeVisible();
    await expect(tips.getByRole("listitem")).toHaveText([
      "孩子說出窗的數量後，可以再問：窗是方的還是長的？",
      "孩子猜的時候先不糾正，說完再告訴他學者怎麼猜。",
    ]);
    const last = (await card
      .locator(".observation-card__cells")
      .boundingBox())!;
    expect((await tips.boundingBox())!.y).toBeGreaterThan(
      last.y + last.height - 1,
    );
  });
});

test.describe("家庭探索活動卡", () => {
  test("上方標出分鐘、步數與「大人要在場」", async ({ page }) => {
    await page.goto(PATH);
    const meta = page.locator(".activity-card").getByRole("list", {
      name: "活動概況",
    });
    await expect(meta.getByRole("listitem")).toHaveText([
      "20 分鐘",
      "4 步",
      "大人要在場",
    ]);
  });

  test("材料、大人要做什麼、和篇章的關係", async ({ page }) => {
    await page.goto(PATH);
    const card = page.locator(".activity-card");
    await expect(card.getByText("紙杯兩個")).toBeVisible();
    await expect(card.getByText("棉線一條")).toBeVisible();
    await expect(card.getByText("迴紋針兩個")).toBeVisible();
    await expect(
      card.getByText("幫忙在紙杯底部戳洞，並提醒孩子拉線時不要太用力。"),
    ).toBeVisible();
    await expect(
      card.getByText("聲音沿著繩子傳到另一端，就像鐘聲沿著竹管傳進機房。"),
    ).toBeVisible();
  });

  test("步驟可以逐步勾選，重新整理後不保留", async ({ page }) => {
    await page.goto(PATH);
    const first = page.getByRole("checkbox", {
      name: "在每個紙杯底部各戳一個小洞",
    });
    const second = page.getByRole("checkbox", {
      name: "把棉線穿過洞，用迴紋針在杯內側卡住",
    });
    await expect(
      page.locator(".activity-card").getByRole("checkbox"),
    ).toHaveCount(4);
    await expect(first).not.toBeChecked();
    await first.check();
    await expect(first).toBeChecked();
    await expect(second).not.toBeChecked();
    await page.reload();
    await expect(first).not.toBeChecked();
  });
});

test.describe("版面與無障礙", () => {
  for (const [name, width] of [
    ["桌面", 1280],
    ["窄螢幕", 375],
  ] as const) {
    test(`${name}沒有水平捲動`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(PATH);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("篇章頁無 axe 違規（含朗讀模式開啟時）", async ({ page }) => {
    await page.goto(PATH);
    await expectNoAxeViolations(page, "篇章頁");
    await page.getByRole("button", { name: "朗讀模式" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoAxeViolations(page, "朗讀模式開啟的篇章頁");
  });

  test("窄螢幕的篇章頁無 axe 違規", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(PATH);
    await expectNoAxeViolations(page, "窄螢幕篇章頁");
  });
});

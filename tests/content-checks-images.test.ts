import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { after, describe, it } from "node:test";
import sharp from "sharp";
import type { Issue } from "../src/content-checks/issue.ts";
import { runContentChecks } from "../src/content-checks/run.ts";
import { LICENSE_HELP } from "../src/content-checks/thresholds.ts";
import { cleanupScenarios, scenario } from "./scenario.ts";

after(cleanupScenarios);

/** 以純色圖覆寫圖檔；檔名不變，格式與尺寸由參數決定。 */
async function writeImage(
  path: string,
  width: number,
  height: number,
  format: "webp" | "jpeg" = "webp",
) {
  const image = sharp({
    create: { width, height, channels: 3, background: "#8899aa" },
  });
  await (format === "webp" ? image.webp() : image.jpeg()).toFile(path);
}

/** 通過情境改壞一處後，應該恰好得到這些問題。 */
async function expectIssues(s: ReturnType<typeof scenario>, expected: Issue[]) {
  assert.deepEqual(await runContentChecks(s.options), expected);
}

const TOWER = "bell-tower-photo.webp";
const WHEEL = "water-wheel-reconstruction.webp";
const REPLICA = "bell-replica.webp";
const IMAGINED = "harbor-morning-imagined.webp";

const TOWER_CREDIT = `    credit:
      author: 測試攝影者甲
      sourceUrl: https://example.com/files/bell-tower-photo
`;
const IMAGINED_ALT = "想像圖：清晨霧港碼頭與鐘樓的水彩風格插畫";
const IMAGINED_BASIS = `    basis:
      evidence: 地方誌記載鐘樓建於風暴之後，日誌記下每日的響鐘時刻
      refs: [bell-log, tide-table]
`;

describe("圖片：正文與 images 對應", () => {
  it("正文多引用一張清單沒有的圖", async () => {
    const s = scenario();
    s.replaceInChapter(
      "渲染到頁面上。\n",
      "渲染到頁面上。\n\n![補圖](./extra.webp)\n",
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message:
          "正文引用了圖片「extra.webp」，但 frontmatter images 沒有列出。",
      },
    ]);
  });

  it("清單多列一張正文沒引用的圖", async () => {
    const s = scenario();
    await writeImage(s.chapterFile("ghost.webp"), 1536, 1024);
    s.replaceInChapter(
      "images:\n",
      `images:
  - file: ghost.webp
    type: artifact-photo
    caption: 多出來的圖
${TOWER_CREDIT}    license:
      name: CC0 1.0
      url: https://creativecommons.org/publicdomain/zero/1.0/
`,
    );
    s.replaceInResearch("## 變動紀錄", "- `ghost.webp`：測試。\n\n## 變動紀錄");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: "frontmatter images 列出了「ghost.webp」，但正文沒有引用。",
      },
    ]);
  });

  it("images 欄位形狀錯誤：回報欄位路徑", async () => {
    const s = scenario();
    s.replaceInChapter("type: artifact-photo", "type: sculpture");
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.file, s.chapterPath);
    assert.match(issues[0]!.message, /^frontmatter images\.0\.type：/);
  });
});

describe("圖片：出處與授權", () => {
  it("非自製圖缺 credit", async () => {
    const s = scenario();
    s.replaceInChapter(TOWER_CREDIT, "");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${TOWER}」（實物照片）是非自製圖，缺少 credit（作者與原始檔案頁）。`,
      },
    ]);
  });

  it("非自製圖缺 license", async () => {
    const s = scenario();
    s.replaceInChapter(
      `    license:
      name: CC BY-SA 4.0
      url: https://creativecommons.org/licenses/by-sa/4.0/
`,
      "",
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${REPLICA}」（複製品照片）是非自製圖，缺少 license（授權名稱與條款連結）。`,
      },
    ]);
  });

  it("非自製圖缺 caption", async () => {
    const s = scenario();
    s.replaceInChapter('    caption: "由測試工坊丙製作的木輪複製品。"\n', "");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${REPLICA}」（複製品照片）缺少 caption（圖說）。`,
      },
    ]);
  });

  for (const name of [
    "CC BY-ND 4.0",
    "CC BY-NC-ND 3.0",
    "All rights reserved",
  ]) {
    it(`授權「${name}」不在可用清單`, async () => {
      const s = scenario();
      s.replaceInChapter("name: CC BY-NC 3.0", `name: ${name}`);
      await expectIssues(s, [
        {
          file: s.chapterPath,
          message: `圖片「${WHEEL}」的授權「${name}」不在可用清單：${LICENSE_HELP}。`,
        },
      ]);
    });
  }

  it("公有領域與六種授權的寫法都接受", async () => {
    for (const name of [
      "公有領域",
      "CC BY 4.0",
      "CC BY-SA 3.0",
      "CC BY-NC-SA 4.0",
      "CC BY 1.0",
      "CC BY 2.5",
    ]) {
      const s = scenario();
      s.replaceInChapter("name: CC BY-NC 3.0", `name: ${name}`);
      assert.deepEqual(await runContentChecks(s.options), [], name);
    }
  });
});

describe("圖片：圖檔規格", () => {
  it("圖檔不存在", async () => {
    const s = scenario();
    rmSync(s.chapterFile(TOWER));
    await expectIssues(s, [
      { file: s.chapterFile(TOWER), message: "找不到圖片檔。" },
    ]);
  });

  it("不是 WebP", async () => {
    const s = scenario();
    await writeImage(s.chapterFile(REPLICA), 1536, 1024, "jpeg");
    await expectIssues(s, [
      {
        file: s.chapterFile(REPLICA),
        message: "圖片必須是 WebP，實際為 jpeg。",
      },
    ]);
  });

  it("長邊不是 1536 px", async () => {
    const s = scenario();
    await writeImage(s.chapterFile(TOWER), 1200, 800);
    await expectIssues(s, [
      {
        file: s.chapterFile(TOWER),
        message: "圖片長邊必須是 1536 px，實際為 1200×800。",
      },
    ]);
  });

  it("超過 300 KB", async () => {
    const s = scenario();
    await sharp(randomBytes(1536 * 1024 * 3), {
      raw: { width: 1536, height: 1024, channels: 3 },
    })
      .webp({ quality: 100 })
      .toFile(s.chapterFile(TOWER));
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.file, s.chapterFile(TOWER));
    assert.match(issues[0]!.message, /^圖片不得超過 300 KB，實際為 \d+ KB。$/);
  });

  it("想像圖不是 3:2", async () => {
    const s = scenario();
    await writeImage(s.chapterFile(IMAGINED), 1536, 1152);
    await expectIssues(s, [
      {
        file: s.chapterFile(IMAGINED),
        message: "想像圖必須是 3:2（寬:高），實際為 1536×1152。",
      },
    ]);
  });

  it("想像圖 3:2 容許四捨五入的 1 px 誤差", async () => {
    const s = scenario();
    await writeImage(s.chapterFile(IMAGINED), 1536, 1025);
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("實物照片不要求 3:2", async () => {
    // 通過情境的實物照片是 4:3，已經涵蓋；這裡確認方向相反的比例也可以。
    const s = scenario();
    await writeImage(s.chapterFile(TOWER), 1024, 1536);
    assert.deepEqual(await runContentChecks(s.options), []);
  });
});

describe("圖片：alt", () => {
  it("想像圖的 alt 沒有冠類型", async () => {
    const s = scenario();
    s.replaceInChapter(`![${IMAGINED_ALT}]`, "![清晨霧港碼頭與鐘樓的插畫]");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${IMAGINED}」的 alt 需以「想像圖：」開頭。`,
      },
    ]);
  });

  it("研究重建圖與複製品照片的 alt 前綴不能互換", async () => {
    const s = scenario();
    s.replaceInChapter("![研究重建：", "![複製品：");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${WHEEL}」的 alt 需以「研究重建：」開頭。`,
      },
    ]);
  });

  it("alt 空白", async () => {
    const s = scenario();
    s.replaceInChapter(`![${IMAGINED_ALT}]`, "![ ]");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${IMAGINED}」的 alt 空白；需描述圖中實際看得到的東西。`,
      },
    ]);
  });

  it("實物照片只要求 alt 不空白", async () => {
    const s = scenario();
    s.replaceInChapter("![霧港鐘樓的外觀，灰白石牆上有四扇狹窄的窗]", "![]");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${TOWER}」的 alt 空白；需描述圖中實際看得到的東西。`,
      },
    ]);
  });
});

describe("圖片：想像圖的依據", () => {
  it("缺 basis", async () => {
    const s = scenario();
    s.replaceInChapter(IMAGINED_BASIS, "");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `想像圖「${IMAGINED}」缺少 basis（依據的證據與參考資料）。`,
      },
    ]);
  });

  it("缺 imagined", async () => {
    const s = scenario();
    s.replaceInChapter(
      "    imagined: 碼頭上的人群、漁船的數量與霧的濃淡都是想像\n",
      "",
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `想像圖「${IMAGINED}」缺少 imagined（想像的部分）。`,
      },
    ]);
  });

  it("basis.refs 指向不存在的參考資料鍵", async () => {
    const s = scenario();
    s.replaceInChapter(
      "refs: [bell-log, tide-table]",
      "refs: [bell-log, nope]",
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `想像圖「${IMAGINED}」的 basis.refs 指向不存在的參考資料鍵「nope」。`,
      },
    ]);
  });
});

describe("圖片：研究紀錄", () => {
  it("研究紀錄不存在", async () => {
    const s = scenario();
    rmSync(s.researchPath);
    await expectIssues(s, [
      { file: s.researchPath, message: "找不到研究紀錄。" },
    ]);
  });

  it("沒有「圖片」一節", async () => {
    const s = scenario();
    s.replaceInResearch("## 圖片", "## 圖檔");
    await expectIssues(s, [
      { file: s.researchPath, message: "研究紀錄找不到「## 圖片」一節。" },
    ]);
  });

  it("「圖片」一節漏列圖檔名", async () => {
    const s = scenario();
    s.replaceInResearch(`\`${REPLICA}\``, "`bell-replica`");
    await expectIssues(s, [
      {
        file: s.researchPath,
        message: `研究紀錄的「圖片」一節沒有列出圖檔「${REPLICA}」。`,
      },
    ]);
  });

  it("圖檔名只出現在別的小節不算", async () => {
    const s = scenario();
    s.replaceInResearch(`\`${REPLICA}\``, "`bell-replica`");
    s.replaceInResearch("建立固定資料", `加入 ${REPLICA}`);
    await expectIssues(s, [
      {
        file: s.researchPath,
        message: `研究紀錄的「圖片」一節沒有列出圖檔「${REPLICA}」。`,
      },
    ]);
  });

  it("檔名是另一個檔名的後半段不算列出", async () => {
    const s = scenario();
    s.replaceInResearch(`\`${REPLICA}\``, `\`old-${REPLICA}\``);
    await expectIssues(s, [
      {
        file: s.researchPath,
        message: `研究紀錄的「圖片」一節沒有列出圖檔「${REPLICA}」。`,
      },
    ]);
  });

  it("研究紀錄不存在時失敗（草稿範例）", async () => {
    // draft 篇章同樣受檢查：它的研究紀錄不存在時一樣失敗。
    const s = scenario();
    rmSync(`${s.researchDir}/draft-sample.md`);
    await expectIssues(s, [
      {
        file: `${s.researchDir}/draft-sample.md`,
        message: "找不到研究紀錄。",
      },
    ]);
  });
});

const TOWER_LINE =
  "![霧港鐘樓的外觀，灰白石牆上有四扇狹窄的窗](./bell-tower-photo.webp)";
const REPLICA_LINE =
  "![複製品：木輪邊緣綁著空心陶罐的小型模型](./bell-replica.webp)";
const WHEEL_LINE =
  "![研究重建：竹管連著綁有陶罐的木輪的剖面圖](./water-wheel-reconstruction.webp)";

describe("圖片：版面規則", () => {
  it("圖片夾在段落文字裡", async () => {
    const s = scenario();
    s.replaceInChapter(TOWER_LINE, `前面的字${TOWER_LINE}後面的字`);
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${TOWER}」必須獨占一段（前後各空一行，同一段不能夾文字）。`,
      },
    ]);
  });

  it("圖片在清單裡", async () => {
    const s = scenario();
    s.replaceInChapter(TOWER_LINE, `- ${TOWER_LINE}`);
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${TOWER}」必須獨占一段（前後各空一行，同一段不能夾文字）。`,
      },
    ]);
  });

  it("圖片接在標題後面而不是段落後面", async () => {
    const s = scenario();
    s.replaceInChapter(`\n\n${TOWER_LINE}`, "");
    s.replaceInChapter(
      "## 鐘樓上的第一個謎團\n",
      `## 鐘樓上的第一個謎團\n\n${TOWER_LINE}\n`,
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `圖片「${TOWER}」必須接在它所屬的段落之後（前面不能是標題、清單、引用、程式碼，或文件開頭）。`,
      },
    ]);
  });

  it("一個段落後面可以接連多張圖", async () => {
    const s = scenario();
    s.replaceInChapter(`\n\n${REPLICA_LINE}`, "");
    s.replaceInChapter(WHEEL_LINE, `${WHEEL_LINE}\n\n${REPLICA_LINE}`);
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("參考式圖片不支援", async () => {
    const s = scenario();
    s.replaceInChapter(
      TOWER_LINE,
      "![霧港鐘樓的外觀][tower]\n\n[tower]: ./bell-tower-photo.webp",
    );
    const issues = await runContentChecks(s.options);
    assert.deepEqual(
      issues.map((i) => i.message),
      [
        `frontmatter images 列出了「${TOWER}」，但正文沒有引用。`,
        "不支援參考式圖片「![霧港鐘樓的外觀][…]」；請改用 ![alt](./x.webp)。",
      ],
    );
  });
});

describe("圖片：欄位規則補充", () => {
  it("images 重複列出同一個 file", async () => {
    const s = scenario();
    s.replaceInChapter(
      "images:\n",
      `images:
  - file: ${TOWER}
    type: artifact-photo
    caption: 重複的一筆
${TOWER_CREDIT}    license:
      name: CC0 1.0
      url: https://creativecommons.org/publicdomain/zero/1.0/
`,
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `frontmatter images 重複列出「${TOWER}」；每張圖只列一次。`,
      },
    ]);
  });

  it("想像圖不得有 caption", async () => {
    const s = scenario();
    s.replaceInChapter(
      "    type: imagined\n",
      "    type: imagined\n    caption: 多餘的圖說\n",
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: `想像圖「${IMAGINED}」不得有 caption；圖說固定為「依據：…想像部分：…」兩句，由 basis 與 imagined 組成。`,
      },
    ]);
  });

  for (const bad of [
    "javascript:alert(1)",
    "data:text/html,x",
    "http://example.com/a",
  ]) {
    it(`credit.sourceUrl 不接受 ${bad}`, async () => {
      const s = scenario();
      s.replaceInChapter("https://example.com/files/bell-tower-photo", bad);
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(
        issues[0]!.message,
        /^frontmatter images\.0\.credit\.sourceUrl：/,
      );
    });

    it(`license.url 不接受 ${bad}`, async () => {
      const s = scenario();
      s.replaceInChapter(
        "https://creativecommons.org/publicdomain/zero/1.0/",
        bad,
      );
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(
        issues[0]!.message,
        /^frontmatter images\.0\.license\.url：/,
      );
    });

    it(`references 的 url 不接受 ${bad}`, async () => {
      const s = scenario();
      s.replaceInChapter(
        "url: https://example.com/library/bell-log",
        `url: ${bad}`,
      );
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /^frontmatter references\.0\.url：/);
    });
  }
});

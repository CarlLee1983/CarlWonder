import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { Issue } from "../src/content-checks/issue.ts";
import { runContentChecks } from "../src/content-checks/run.ts";

// 通過情境就是 e2e 用的固定資料篇章（兩篇都必須通過），fixture 只維護這一份。
const fixtures = fileURLToPath(new URL("./fixtures/chapters", import.meta.url));
const cli = fileURLToPath(
  new URL("../scripts/check-content.ts", import.meta.url),
);
const slug = "sample-chapter";
const draftSlug = "draft-sample";
const workDirs: string[] = [];

/** 把通過情境複製到暫存目錄，讓每個測試各自改壞一處。 */
function scenario() {
  const root = mkdtempSync(join(tmpdir(), "content-checks-"));
  workDirs.push(root);
  cpSync(fixtures, root, { recursive: true });
  const chapterPath = join(root, slug, "chapter.md");
  const storyPath = join(root, slug, "story.md");
  const draftChapterPath = join(root, draftSlug, "chapter.md");
  return {
    root,
    draftChapterPath,
    chapterPath,
    storyPath,
    options: { chaptersDir: root },
    read: (path: string) => readFileSync(path, "utf8"),
    write: (path: string, content: string) => writeFileSync(path, content),
    /** 取代 chapter.md 的 frontmatter 之後的內文，frontmatter 保持原樣。 */
    setBody(body: string) {
      const text = readFileSync(chapterPath, "utf8");
      const end = text.indexOf("\n---\n", 4) + "\n---\n".length;
      writeFileSync(chapterPath, `${text.slice(0, end)}\n${body}`);
    },
    /** 在 chapter.md 內做字串取代；找不到要取代的文字就失敗，避免測試空轉。 */
    replaceInChapter(from: string, to: string) {
      const text = readFileSync(chapterPath, "utf8");
      assert.ok(text.includes(from), `fixture 找不到：${from}`);
      writeFileSync(chapterPath, text.replace(from, to));
    },
  };
}

/** 最小的合法正文：`n` 個字加上固定的結尾小節（標題「開場」計 2 字）。 */
const bodyWith = (n: number) =>
  `## 開場\n\n${"字".repeat(n - 2)}\n\n## 還不知道的事\n\n還有很多。\n`;

const mentions = (issues: Issue[], text: string) =>
  issues.filter((issue) => issue.message.includes(text));

after(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe("runContentChecks", () => {
  it("通過情境沒有問題", async () => {
    assert.deepEqual(await runContentChecks(scenario().options), []);
  });

  it("空的篇章目錄也通過", async () => {
    const s = scenario();
    rmSync(join(s.root, slug), { recursive: true });
    rmSync(join(s.root, draftSlug), { recursive: true });
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("CHAPTERS_DIR 指向檔案：回報問題並保留系統錯誤，不崩潰", async () => {
    const s = scenario();
    const issues = await runContentChecks({ chaptersDir: s.chapterPath });
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.file, s.chapterPath);
    assert.match(issues[0]!.message, /無法讀取.*ENOTDIR/);
  });

  it("story.md 是資料夾：回報問題並保留系統錯誤，不崩潰", async () => {
    const s = scenario();
    rmSync(s.storyPath);
    mkdirSync(s.storyPath);
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.file, s.storyPath);
    assert.match(issues[0]!.message, /無法讀取.*EISDIR/);
  });

  it("chapter.md 是資料夾：回報問題並保留系統錯誤，不崩潰", async () => {
    const s = scenario();
    rmSync(s.chapterPath);
    mkdirSync(s.chapterPath);
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.file, s.chapterPath);
    assert.match(issues[0]!.message, /無法讀取.*EISDIR/);
  });

  it("找不到篇章目錄時回報問題而不是崩潰", async () => {
    const s = scenario();
    const issues = await runContentChecks({
      chaptersDir: join(s.root, "不存在"),
    });
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /CHAPTERS_DIR/);
  });

  it("可以提供 onWarning；沒有警告級規則時不會收到任何東西", async () => {
    const s = scenario();
    const warnings: Issue[] = [];
    const issues = await runContentChecks({
      ...s.options,
      onWarning: (warning) => warnings.push(warning),
    });
    assert.deepEqual(issues, []);
    assert.deepEqual(warnings, []);
  });

  describe("標題", () => {
    const TITLE = "範例篇章：固定資料的測試題材";
    /** 把標題改成 `title`，斷言只有一項標題問題並回傳其訊息。 */
    async function titleIssue(title: string) {
      const s = scenario();
      s.replaceInChapter(TITLE, title);
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.equal(issues[0]!.file, s.chapterPath);
      return issues[0]!.message;
    }

    it("缺少全形冒號", async () => {
      assert.equal(
        await titleIssue("範例篇章"),
        "標題「範例篇章」不是「X：Y」格式（需要全形冒號「：」，且前後都要有文字）。",
      );
    });

    it("半形冒號不算", async () => {
      assert.match(
        await titleIssue("範例篇章:測試題材"),
        /標題「範例篇章:測試題材」不是「X：Y」格式/,
      );
    });

    it("冒號後面是空的", async () => {
      assert.match(
        await titleIssue("範例篇章： "),
        /標題「範例篇章： 」不是「X：Y」格式/,
      );
    });

    it("冒號前面是空的", async () => {
      assert.match(
        await titleIssue("：固定資料的測試題材"),
        /標題「：固定資料的測試題材」不是「X：Y」格式/,
      );
    });

    for (const word of ["驚人", "顛覆", "震驚"]) {
      it(`含禁用字「${word}」`, async () => {
        assert.equal(
          await titleIssue(`範例篇章：${word}的測試題材`),
          `標題「範例篇章：${word}的測試題材」含禁用字「${word}」。`,
        );
      });
    }

    it("沒有 title 欄位", async () => {
      const s = scenario();
      s.replaceInChapter(/title: .*\n/.exec(s.read(s.chapterPath))![0], "");
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /title/);
    });
  });

  describe("正文字數", () => {
    it("太短時訊息帶實際值與門檻", async () => {
      const s = scenario();
      s.setBody(bodyWith(102));
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.equal(issues[0]!.file, s.chapterPath);
      assert.match(issues[0]!.message, /正文 102 字，需 3,000–5,000 字/);
    });

    it("太長時訊息帶實際值與門檻", async () => {
      const s = scenario();
      s.setBody(bodyWith(5002));
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /正文 5,002 字，需 3,000–5,000 字/);
    });

    for (const [n, ok] of [
      [2999, false],
      [3000, true],
      [5000, true],
      [5001, false],
    ] as const) {
      it(`${n} 字${ok ? "通過" : "失敗"}（邊界）`, async () => {
        const s = scenario();
        s.setBody(bodyWith(n));
        assert.equal((await runContentChecks(s.options)).length, ok ? 0 : 1);
      });
    }

    it("「還不知道的事」之後的文字不計入正文", async () => {
      const s = scenario();
      s.setBody(
        `${bodyWith(3000)}${"字".repeat(3000)}\n`, // 結尾小節後面再塞 3,000 字
      );
      assert.deepEqual(await runContentChecks(s.options), []);
    });

    it("中英混排依計字規則計算", async () => {
      const s = scenario();
      // 標題 2 字 + 1,499 個「字」+ 1,500 個英文詞 = 3,001
      s.setBody(
        `## 開場\n\n${"字".repeat(1499)} ${"ab ".repeat(1500)}\n\n## 還不知道的事\n\n無。\n`,
      );
      assert.deepEqual(await runContentChecks(s.options), []);
    });
  });

  describe("故事開場", () => {
    it("太短時訊息帶實際值與門檻", async () => {
      const s = scenario();
      s.write(s.storyPath, "字".repeat(100));
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.equal(issues[0]!.file, s.storyPath);
      assert.match(issues[0]!.message, /故事開場 100 字，需 450–600 字/);
    });

    it("太長時訊息帶實際值與門檻", async () => {
      const s = scenario();
      s.write(s.storyPath, "字".repeat(1000));
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /故事開場 1,000 字，需 450–600 字/);
    });

    for (const [n, ok] of [
      [449, false],
      [450, true],
      [600, true],
      [601, false],
    ] as const) {
      it(`${n} 字${ok ? "通過" : "失敗"}（邊界）`, async () => {
        const s = scenario();
        s.write(s.storyPath, "字".repeat(n));
        assert.equal((await runContentChecks(s.options)).length, ok ? 0 : 1);
      });
    }

    it("story.md 的 frontmatter 不計字數", async () => {
      const s = scenario();
      s.write(
        s.storyPath,
        `---\nnote: ${"x ".repeat(500)}\n---\n${"字".repeat(500)}`,
      );
      assert.deepEqual(await runContentChecks(s.options), []);
    });

    it("缺少 story.md", async () => {
      const s = scenario();
      rmSync(s.storyPath);
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.equal(issues[0]!.file, s.storyPath);
      assert.match(issues[0]!.message, /story\.md/);
    });
  });

  describe("最後一個二級標題", () => {
    it("後面多了別的二級標題", async () => {
      const s = scenario();
      s.write(s.chapterPath, `${s.read(s.chapterPath)}\n## 後記\n\n結語。\n`);
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /最後一個 ## 標題.*後記.*還不知道的事/);
    });

    it("沒有「還不知道的事」", async () => {
      const s = scenario();
      s.replaceInChapter("## 還不知道的事", "## 其他");
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /最後一個 ## 標題.*其他/);
    });

    it("完全沒有二級標題", async () => {
      const s = scenario();
      s.setBody(`${"字".repeat(3100)}\n`);
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /最後一個 ## 標題/);
    });

    it("三級標題不算二級標題", async () => {
      const s = scenario();
      s.write(
        s.chapterPath,
        `${s.read(s.chapterPath)}\n### 附帶說明\n\n補充。\n`,
      );
      assert.deepEqual(await runContentChecks(s.options), []);
    });
  });

  describe("標題解析", () => {
    /** 取代整份正文並回傳問題清單。 */
    async function issuesFor(body: string) {
      const s = scenario();
      s.setBody(body);
      return runContentChecks(s.options);
    }
    const filler = (n: number) => "字".repeat(n);

    it("結尾帶 ## 收尾記號的「還不知道的事」也認得", async () => {
      const issues = await issuesFor(
        `## 開場\n\n${filler(3100)}\n\n## 還不知道的事 ##\n\n還有很多。\n`,
      );
      assert.deepEqual(issues, []);
    });

    it("程式碼圍欄裡的 ## 不是標題", async () => {
      const issues = await issuesFor(
        `## 開場\n\n${filler(3100)}\n\n## 還不知道的事\n\n還有很多。\n\n\`\`\`md\n## 後記\n\`\`\`\n`,
      );
      assert.deepEqual(issues, []);
    });

    it("圍欄裡的「## 還不知道的事」不會把正文提早截斷", async () => {
      const issues = await issuesFor(
        `## 開場\n\n\`\`\`md\n## 還不知道的事\n\`\`\`\n\n${filler(3100)}\n\n## 還不知道的事\n\n無。\n`,
      );
      assert.deepEqual(issues, []);
    });

    it("同名標題出現兩次：正文計到最後一個，不會變成 0 字", async () => {
      const issues = await issuesFor(
        `## 還不知道的事\n\n先提一點。\n\n## 開場\n\n${filler(3100)}\n\n## 還不知道的事\n\n無。\n`,
      );
      assert.deepEqual(issues, []);
    });

    it("最後一個 ## 不是「還不知道的事」時計全文，只有標題那項失敗", async () => {
      // 全文 = 2,990 + 結尾小節與後記共 14 字 = 3,004，落在區間內
      const issues = await issuesFor(`${bodyWith(2990)}\n## 後記\n\n結語。\n`);
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /最後一個 ## 標題是「後記」/);
    });
  });

  describe("禁用句型", () => {
    for (const phrase of ["科學無法解釋", "科學家都嚇呆了", "證明了外星人"]) {
      it(`正文含「${phrase}」`, async () => {
        const s = scenario();
        s.replaceInChapter("木輪轉到某個角度", `${phrase}，木輪轉到某個角度`);
        const issues = await runContentChecks(s.options);
        assert.equal(issues.length, 1);
        assert.equal(issues[0]!.file, s.chapterPath);
        assert.equal(mentions(issues, `「${phrase}」`).length, 1);
      });
    }

    it("「還不知道的事」小節裡出現也算", async () => {
      const s = scenario();
      s.replaceInChapter("我們還不知道。", "科學無法解釋。");
      assert.equal(
        mentions(await runContentChecks(s.options), "科學無法解釋").length,
        1,
      );
    });
  });

  describe("frontmatter", () => {
    it("YAML 語法壞掉：回報問題而不是崩潰，且仍檢查 story.md", async () => {
      const s = scenario();
      s.replaceInChapter("draft: false", "draft: [未關閉");
      s.write(s.storyPath, "字".repeat(100));
      const issues = await runContentChecks(s.options);
      assert.equal(mentions(issues, "frontmatter").length, 1);
      assert.equal(mentions(issues, "故事開場 100 字").length, 1);
    });

    it("沒有 frontmatter 區塊", async () => {
      const s = scenario();
      s.write(s.chapterPath, bodyWith(3100));
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /frontmatter/);
    });

    it("缺少 chapter.md", async () => {
      const s = scenario();
      rmSync(s.chapterPath);
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 1);
      assert.equal(issues[0]!.file, s.chapterPath);
      assert.match(issues[0]!.message, /chapter\.md/);
    });
  });

  it("draft 篇章同樣受檢查：標題與故事開場都會擋", async () => {
    const s = scenario();
    const text = s.read(s.draftChapterPath);
    assert.match(text, /draft: true/);
    s.write(s.draftChapterPath, text.replace("草稿範例：不該", "草稿範例不該"));
    s.write(join(s.root, draftSlug, "story.md"), "字".repeat(10));
    const issues = await runContentChecks(s.options);
    assert.deepEqual(issues, [
      {
        file: s.draftChapterPath,
        message:
          "標題「草稿範例不該被輸出的篇章」不是「X：Y」格式（需要全形冒號「：」，且前後都要有文字）。",
      },
      {
        file: join(s.root, draftSlug, "story.md"),
        message: "故事開場 10 字，需 450–600 字。",
      },
    ]);
  });

  it("多篇篇章各自回報，問題指向各自的檔案", async () => {
    const s = scenario();
    const draftStory = join(s.root, draftSlug, "story.md");
    rmSync(s.storyPath);
    rmSync(draftStory);
    const files = (await runContentChecks(s.options)).map((i) => i.file).sort();
    assert.deepEqual(files, [draftStory, s.storyPath]);
  });
});

describe("check-content CLI", () => {
  const run = (chaptersDir: string) =>
    spawnSync(process.execPath, ["--experimental-strip-types", cli], {
      env: { ...process.env, CHAPTERS_DIR: chaptersDir },
      encoding: "utf8",
    });

  it("通過情境結束碼 0", () => {
    const result = run(fixtures);
    assert.equal(result.status, 0, result.stderr);
  });

  it("空目錄結束碼 0", () => {
    const root = mkdtempSync(join(tmpdir(), "content-checks-empty-"));
    workDirs.push(root);
    assert.equal(run(root).status, 0);
  });

  it("有硬性問題時非零結束，並印出檔案與原因", () => {
    const s = scenario();
    s.write(s.storyPath, "字".repeat(100));
    const result = run(s.root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /story\.md.*故事開場 100 字，需 450–600 字/);
  });

  it("story.md 是資料夾不會讓 CLI 崩潰", () => {
    const s = scenario();
    rmSync(s.storyPath);
    mkdirSync(s.storyPath);
    const result = run(s.root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /story\.md.*EISDIR/);
    assert.doesNotMatch(result.stderr, /at .*\.ts:\d+/);
  });

  it("frontmatter 壞掉不會讓 CLI 崩潰（錯誤訊息而非堆疊）", () => {
    const s = scenario();
    s.write(s.chapterPath, "沒有 frontmatter");
    const result = run(s.root);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stderr, /at .*\.ts:\d+/);
  });
});

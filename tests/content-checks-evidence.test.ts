import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import type { Issue } from "../src/content-checks/issue.ts";
import { runContentChecks } from "../src/content-checks/run.ts";
import { cleanupScenarios, scenario } from "./scenario.ts";

after(cleanupScenarios);

/** 通過情境改壞一處後，應該恰好得到這些問題。 */
async function expectIssues(s: ReturnType<typeof scenario>, expected: Issue[]) {
  assert.deepEqual(await runContentChecks(s.options), expected);
}

/** 只有一項問題，且訊息符合 pattern（zod 的原始訊息不逐字比對）。 */
async function expectOneIssue(s: ReturnType<typeof scenario>, pattern: RegExp) {
  const issues = await runContentChecks(s.options);
  assert.equal(issues.length, 1, JSON.stringify(issues));
  assert.equal(issues[0]!.file, s.chapterPath);
  assert.match(issues[0]!.message, pattern);
}

// 通過情境最後兩條證據說明（傳說、未知），刪掉它們剩 4 條。
const LAST_TWO_NOTES = `  - claim: 隱居鐘匠留下永不停止的機器
    level: legend
    refs: [keeper-oral-history]
  - claim: 岩石底下的洞穴有多大
    level: unknown
`;
const extraNote = (n: number) => `  - claim: 多出來的第 ${n} 個疑問
    level: unknown
`;
const EVIDENCE_NOTES_START = "evidenceNotes:\n";
const NOTES_END = "    level: unknown\nimages:\n";

/** 把 n 條額外的未知主張接在證據說明最後（通過情境本來有 6 條）。 */
function appendNotes(s: ReturnType<typeof scenario>, count: number) {
  s.replaceInChapter(
    NOTES_END,
    `    level: unknown\n${Array.from({ length: count }, (_, i) => extraNote(i + 1)).join("")}images:\n`,
  );
}

describe("參考資料鍵", () => {
  it("鍵重複", async () => {
    const s = scenario();
    s.replaceInChapter(
      EVIDENCE_NOTES_START,
      `  - key: bell-log
    author: 另一位作者
    year: "2000"
    title: 重複鍵的文獻
    publisher: 某出版社
    url: https://example.com/dup
    accessed: "2026-01-11"
${EVIDENCE_NOTES_START}`,
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: "參考資料鍵「bell-log」重複；每個鍵只能出現一次。",
      },
    ]);
  });

  it("證據說明的 ref 指向未定義的鍵", async () => {
    const s = scenario();
    s.replaceInChapter("refs: [tide-table]\n", "refs: [nope]\n");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: "證據說明第 3 條的 refs 指向不存在的參考資料鍵「nope」。",
      },
    ]);
  });

  it("鍵含大寫或底線是 schema 錯誤", async () => {
    const s = scenario();
    s.replaceInChapter("key: keeper-oral-history", "key: Keeper_Oral");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message: "frontmatter references.3.key：鍵只能用小寫英文、數字與連字號",
      },
    ]);
  });
});

describe("證據說明條數", () => {
  it("4 條不足", async () => {
    const s = scenario();
    s.replaceInChapter(LAST_TWO_NOTES, "");
    await expectIssues(s, [
      { file: s.chapterPath, message: "證據說明 4 條，需 5–10 條。" },
    ]);
  });

  it("11 條過多", async () => {
    const s = scenario();
    appendNotes(s, 5);
    await expectIssues(s, [
      { file: s.chapterPath, message: "證據說明 11 條，需 5–10 條。" },
    ]);
  });

  it("5 條與 10 條都通過", async () => {
    const few = scenario();
    few.replaceInChapter(
      `  - claim: 岩石底下的洞穴有多大
    level: unknown
`,
      "",
    );
    await expectIssues(few, []);

    const many = scenario();
    appendNotes(many, 4);
    await expectIssues(many, []);
  });

  it("完全沒有證據說明", async () => {
    const s = scenario();
    const text = s.read(s.chapterPath);
    const start = text.indexOf(EVIDENCE_NOTES_START);
    const end = text.indexOf("images:\n", start);
    s.write(s.chapterPath, text.slice(0, start) + text.slice(end));
    await expectIssues(s, [
      { file: s.chapterPath, message: "證據說明 0 條，需 5–10 條。" },
    ]);
  });
});

describe("證據等級的 ref 規則", () => {
  it("已知沒有 ref", async () => {
    const s = scenario();
    s.replaceInChapter(
      "    level: known\n    refs: [bell-log]\n",
      "    level: known\n",
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message:
          "證據說明第 1 條（已知）沒有任何參考資料；已知至少要有一個 refs。",
      },
    ]);
  });

  it("已知的 refs 是空陣列也算沒有", async () => {
    const s = scenario();
    s.replaceInChapter(
      "    level: known\n    refs: [bell-log]\n",
      "    level: known\n    refs: []\n",
    );
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message:
          "證據說明第 1 條（已知）沒有任何參考資料；已知至少要有一個 refs。",
      },
    ]);
  });

  it("未知、推論、傳說可以沒有 ref", async () => {
    const s = scenario();
    s.replaceInChapter(
      "    level: inferred\n    refs: [tide-table]\n",
      "    level: inferred\n",
    );
    s.replaceInChapter(
      "    level: legend\n    refs: [keeper-oral-history]\n",
      "    level: legend\n",
    );
    s.replaceInChapter(
      "    level: unknown\n",
      "    level: unknown\n    refs: []\n",
    );
    await expectIssues(s, []);
  });

  it("等級不在四種之內是 schema 錯誤", async () => {
    const s = scenario();
    s.replaceInChapter("level: legend", "level: myth");
    await expectOneIssue(s, /^frontmatter evidenceNotes\.4\.level：/);
  });
});

describe("參考資料與查核日期的 schema", () => {
  it("缺少 author", async () => {
    const s = scenario();
    s.replaceInChapter("    author: 霧港鎮公所\n", "");
    await expectOneIssue(s, /^frontmatter references\.0\.author：/);
  });

  it("accessed 不是合法日期", async () => {
    const s = scenario();
    s.replaceInChapter('accessed: "2026-01-10"', 'accessed: "2026-02-30"');
    await expectOneIssue(s, /^frontmatter references\.0\.accessed：/);
  });

  it("lastChecked 沒加引號同樣提示加引號", async () => {
    const s = scenario();
    s.replaceInChapter('lastChecked: "2026-01-20"', "lastChecked: 2026-01-20");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message:
          'frontmatter lastChecked：日期請加引號寫成 "YYYY-MM-DD"，否則 YAML 會讀成日期型別。',
      },
    ]);
  });

  it("year 可以寫成沒加引號的數字", async () => {
    const s = scenario();
    s.replaceInChapter('year: "2019"', "year: 2019");
    await expectIssues(s, []);
  });

  it("日期沒加引號會被 YAML 讀成日期型別，與建置一致地擋下", async () => {
    const s = scenario();
    s.replaceInChapter('accessed: "2026-01-10"', "accessed: 2026-01-10");
    await expectIssues(s, [
      {
        file: s.chapterPath,
        message:
          'frontmatter references.0.accessed：日期請加引號寫成 "YYYY-MM-DD"，否則 YAML 會讀成日期型別。',
      },
    ]);
  });

  it("lastChecked 格式錯誤", async () => {
    const s = scenario();
    s.replaceInChapter(
      'lastChecked: "2026-01-20"',
      'lastChecked: "2026/01/20"',
    );
    await expectOneIssue(s, /^frontmatter lastChecked：/);
  });

  it("缺少 lastChecked", async () => {
    const s = scenario();
    s.replaceInChapter('lastChecked: "2026-01-20"\n', "");
    await expectOneIssue(s, /^frontmatter lastChecked：/);
  });

  it("其他 frontmatter 欄位（summary）也由同一個 schema 擋下", async () => {
    const s = scenario();
    s.replaceInChapter(/summary: .*\n/.exec(s.read(s.chapterPath))![0], "");
    await expectOneIssue(s, /^frontmatter summary：/);
  });
});

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import type { Issue } from "../src/content-checks/issue.ts";
import { runContentChecks } from "../src/content-checks/run.ts";
import { cleanupScenarios, scenario } from "./scenario.ts";

after(cleanupScenarios);

type Scenario = ReturnType<typeof scenario>;

/** 通過情境改壞一處後，應該恰好得到這些硬性問題。 */
async function expectIssues(s: Scenario, expected: Issue[]) {
  assert.deepEqual(await runContentChecks(s.options), expected);
}

/** 執行檢查並收集警告。 */
async function run(s: Scenario) {
  const warnings: Issue[] = [];
  const issues = await runContentChecks({
    ...s.options,
    onWarning: (warning) => warnings.push(warning),
  });
  return { issues, warnings };
}

const chapterIssue = (s: Scenario, message: string): Issue => ({
  file: s.chapterPath,
  message,
});

// 通過情境的活動：minutes 20，四個步驟，最後一步如下。
const LAST_STEP = "      - 一人輕聲說話，另一人把杯子貼在耳邊聽\n";
const extraSteps = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => `      - 多出來的步驟 ${i + 1}\n`,
  ).join("");

describe("親子共學：錨點圖片", () => {
  it("通過情境沒有問題也沒有警告", async () => {
    assert.deepEqual(await run(scenario()), { issues: [], warnings: [] });
  });

  it("錨點是想像圖：失敗", async () => {
    const s = scenario();
    s.replaceInChapter(
      "anchorImage: bell-tower-photo.webp",
      "anchorImage: harbor-morning-imagined.webp",
    );
    await expectIssues(s, [
      chapterIssue(
        s,
        "family.anchorImage「harbor-morning-imagined.webp」是想像圖，錨點必須是實物照片。",
      ),
    ]);
  });

  it("錨點是研究重建圖：失敗", async () => {
    const s = scenario();
    s.replaceInChapter(
      "anchorImage: bell-tower-photo.webp",
      "anchorImage: water-wheel-reconstruction.webp",
    );
    await expectIssues(s, [
      chapterIssue(
        s,
        "family.anchorImage「water-wheel-reconstruction.webp」是研究重建圖，錨點必須是實物照片。",
      ),
    ]);
  });

  it("錨點檔不在 images 裡：失敗", async () => {
    const s = scenario();
    s.replaceInChapter(
      "anchorImage: bell-tower-photo.webp",
      "anchorImage: missing.webp",
    );
    await expectIssues(s, [
      chapterIssue(
        s,
        "family.anchorImage「missing.webp」不在 frontmatter images 裡；錨點必須是 images 中的實物照片。",
      ),
    ]);
  });
});

describe("親子共學：活動上限", () => {
  it("minutes 31：失敗", async () => {
    const s = scenario();
    s.replaceInChapter("minutes: 20", "minutes: 31");
    await expectIssues(s, [
      chapterIssue(s, "活動 minutes 為 31，不得超過 30 分鐘。"),
    ]);
  });

  it("minutes 30：通過", async () => {
    const s = scenario();
    s.replaceInChapter("minutes: 20", "minutes: 30");
    await expectIssues(s, []);
  });

  it("7 步：失敗", async () => {
    const s = scenario();
    s.replaceInChapter(LAST_STEP, LAST_STEP + extraSteps(3));
    await expectIssues(s, [
      chapterIssue(s, "活動有 7 個步驟，不得超過 6 步。"),
    ]);
  });

  it("6 步：通過", async () => {
    const s = scenario();
    s.replaceInChapter(LAST_STEP, LAST_STEP + extraSteps(2));
    await expectIssues(s, []);
  });

  it("adultRole 只有空白：失敗", async () => {
    const s = scenario();
    s.replaceInChapter(
      "adultRole: 幫忙在紙杯底部戳洞，並提醒孩子拉線時不要太用力。",
      'adultRole: "   "',
    );
    await expectIssues(s, [
      chapterIssue(s, "活動的 adultRole（大人要做什麼）空白；必填。"),
    ]);
  });
});

describe("親子共學：禁用清單警告", () => {
  it("材料含「蠟燭」：一則警告，檢查仍通過", async () => {
    const s = scenario();
    s.replaceInChapter("      - 紙杯兩個\n", "      - 蠟燭一支\n");
    assert.deepEqual(await run(s), {
      issues: [],
      warnings: [
        chapterIssue(
          s,
          "活動的 activity.materials 含禁用清單關鍵字「蠟燭」，對應 docs/writing-spec.md〈家庭探索活動〉禁用清單「明火與加熱」；請確認活動是否仍安全。",
        ),
      ],
    });
  });

  it("同一個關鍵字出現在多個欄位：合成一則，列出全部欄位", async () => {
    const s = scenario();
    s.replaceInChapter("name: 紙杯回聲鐘", "name: 蠟燭回聲鐘");
    s.replaceInChapter(
      "      - 在每個紙杯底部各戳一個小洞\n",
      "      - 點亮蠟燭\n",
    );
    const { issues, warnings } = await run(s);
    assert.deepEqual(issues, []);
    assert.deepEqual(
      warnings.map((w) => w.message),
      [
        "活動的 activity.name、activity.steps 含禁用清單關鍵字「蠟燭」，對應 docs/writing-spec.md〈家庭探索活動〉禁用清單「明火與加熱」；請確認活動是否仍安全。",
      ],
    );
  });

  it("不同關鍵字各一則", async () => {
    const s = scenario();
    s.replaceInChapter("      - 紙杯兩個\n", "      - 氣球一顆\n");
    s.replaceInChapter(
      "adultRole: 幫忙在紙杯底部戳洞，並提醒孩子拉線時不要太用力。",
      "adultRole: 用打火機加熱封口。",
    );
    const { issues, warnings } = await run(s);
    assert.deepEqual(issues, []);
    assert.deepEqual(
      warnings.map((w) => w.message).sort(),
      [
        "活動的 activity.adultRole 含禁用清單關鍵字「加熱」，對應 docs/writing-spec.md〈家庭探索活動〉禁用清單「明火與加熱」；請確認活動是否仍安全。",
        "活動的 activity.adultRole 含禁用清單關鍵字「打火機」，對應 docs/writing-spec.md〈家庭探索活動〉禁用清單「明火與加熱」；請確認活動是否仍安全。",
        "活動的 activity.materials 含禁用清單關鍵字「氣球」，對應 docs/writing-spec.md〈家庭探索活動〉禁用清單「8 歲以下孩子用氣球」；請確認活動是否仍安全。",
      ].sort(),
    );
  });

  it("材料含小零件：提醒確認已寫明家長收好", async () => {
    const s = scenario();
    s.replaceInChapter("      - 紙杯兩個\n", "      - 小珠十顆\n");
    assert.deepEqual(await run(s), {
      issues: [],
      warnings: [
        chapterIssue(
          s,
          "活動的 activity.materials 含「小珠」，請確認已寫明提醒家長收好、不讓年幼的弟妹拿到（docs/writing-spec.md〈家庭探索活動〉）。",
        ),
      ],
    });
  });

  it("小零件、彈珠各一則；只看材料，步驟提到不算", async () => {
    const s = scenario();
    s.replaceInChapter(
      "      - 紙杯兩個\n",
      "      - 小零件一包\n      - 彈珠三顆\n",
    );
    s.replaceInChapter("在每個紙杯底部各戳一個小洞", "把小珠放進杯子");
    const { issues, warnings } = await run(s);
    assert.deepEqual(issues, []);
    assert.deepEqual(
      warnings.map((w) => w.message),
      [
        "活動的 activity.materials 含「小零件」，請確認已寫明提醒家長收好、不讓年幼的弟妹拿到（docs/writing-spec.md〈家庭探索活動〉）。",
        "活動的 activity.materials 含「彈珠」，請確認已寫明提醒家長收好、不讓年幼的弟妹拿到（docs/writing-spec.md〈家庭探索活動〉）。",
      ],
    );
  });
});

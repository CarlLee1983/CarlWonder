import assert from "node:assert/strict";
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
import { fileURLToPath } from "node:url";
import type { Issue } from "../src/content-checks/issue.ts";

// 通過情境就是 e2e 用的固定資料篇章與其研究紀錄（兩篇都必須通過），fixture 只維護這一份。
export const fixtures = fileURLToPath(
  new URL("./fixtures/chapters", import.meta.url),
);
export const fixtureResearch = fileURLToPath(
  new URL("./fixtures/research", import.meta.url),
);
/** 通過情境 frontmatter 列出的四張圖，各自獨占一段；接在某個段落後面才符合版面規則。 */
export const FIXTURE_IMAGES = [
  "![霧港鐘樓的外觀，灰白石牆上有四扇狹窄的窗](./bell-tower-photo.webp)",
  "![研究重建：竹管連著綁有陶罐的木輪的剖面圖](./water-wheel-reconstruction.webp)",
  "![複製品：木輪邊緣綁著空心陶罐的小型模型](./bell-replica.webp)",
  "![想像圖：清晨霧港碼頭與鐘樓的水彩風格插畫](./harbor-morning-imagined.webp)",
].join("\n\n");

export const slug = "sample-chapter";
export const draftSlug = "draft-sample";
const workDirs: string[] = [];

/** 刪除所有 scenario 與 makeTempDir 建立的暫存目錄；放進測試檔的 `after`。 */
export function cleanupScenarios() {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
}

/** 建一個會在 cleanupScenarios 時刪除的空暫存目錄。 */
export function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  workDirs.push(dir);
  return dir;
}

/** 把通過情境複製到暫存目錄，讓每個測試各自改壞一處。 */
export function scenario() {
  const base = makeTempDir("content-checks-");
  const root = join(base, "chapters");
  const researchDir = join(base, "research");
  cpSync(fixtures, root, { recursive: true });
  cpSync(fixtureResearch, researchDir, { recursive: true });
  const chapterPath = join(root, slug, "chapter.md");
  const storyPath = join(root, slug, "story.md");
  const draftChapterPath = join(root, draftSlug, "chapter.md");
  return {
    root,
    researchDir,
    draftChapterPath,
    chapterPath,
    storyPath,
    /** 篇章資料夾內某個檔案的路徑。 */
    chapterFile: (name: string) => join(root, slug, name),
    researchPath: join(researchDir, `${slug}.md`),
    options: { chaptersDir: root, researchDir },
    read: (path: string) => readFileSync(path, "utf8"),
    write: (path: string, content: string) => writeFileSync(path, content),
    mkdir: (path: string) => mkdirSync(path),
    /** 取代 chapter.md 的 frontmatter 之後的內文，frontmatter 保持原樣；圖片要由 body 自己帶（見 FIXTURE_IMAGES）。 */
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
    /** 在研究紀錄內做字串取代，找不到同樣失敗。 */
    replaceInResearch(from: string, to: string) {
      const text = readFileSync(join(researchDir, `${slug}.md`), "utf8");
      assert.ok(text.includes(from), `fixture 找不到：${from}`);
      writeFileSync(join(researchDir, `${slug}.md`), text.replace(from, to));
    },
  };
}

export const mentions = (issues: Issue[], text: string) =>
  issues.filter((issue) => issue.message.includes(text));

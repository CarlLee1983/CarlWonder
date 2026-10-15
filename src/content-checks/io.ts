import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";

/** frontmatter 缺少或無法解析：內容有誤，訊息可直接給站主看。 */
export class FrontmatterError extends Error {}

/** 目錄下每個子資料夾的名稱；不存在時回傳 null。 */
export function listDirectories(dir: string): string[] | null {
  if (!existsSync(dir)) return null;
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** 讀取文字檔；缺檔回傳 undefined，其他讀取錯誤（例如路徑是資料夾）照樣丟出。 */
function readText(file: string): string | undefined {
  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
}

/** 切開開頭的 frontmatter 區塊（不含 `---` 線）與其後的內文；沒有區塊時 yaml 為 undefined。 */
function splitFrontmatter(text: string): { yaml?: string; body: string } {
  const match = FRONTMATTER.exec(text);
  return match
    ? { yaml: match[1]!, body: text.slice(match[0].length) }
    : { body: text };
}

/** 讀取 Markdown 檔：frontmatter 與其後的內文；缺檔回傳 undefined，沒有 frontmatter 或語法錯誤時丟出錯誤。 */
export function readMarkdown(
  file: string,
): { data: unknown; body: string } | undefined {
  const text = readText(file);
  if (text === undefined) return undefined;
  const { yaml, body } = splitFrontmatter(text);
  if (yaml === undefined) {
    throw new FrontmatterError("找不到 frontmatter（檔案須以 --- 區塊開頭）。");
  }
  try {
    // Astro 用 js-yaml 預設 schema 解析 frontmatter；這裡以 yaml 的 core schema 加 timestamp
    // 近似它的日期行為（沒加引號的 2026-01-10 是日期型別，schema 才擋得到）。
    // 其他語法（例如合併鍵）不保證與 Astro 一致。
    return { data: parse(yaml, { customTags: ["timestamp"] }), body };
  } catch (error) {
    throw new FrontmatterError(
      `frontmatter 無法解析：${(error as Error).message}`,
      { cause: error },
    );
  }
}

/** 讀取純文字 Markdown 的內文；開頭若有 frontmatter 區塊就略過（不解析），缺檔回傳 undefined。 */
export function readMarkdownBody(file: string): string | undefined {
  const text = readText(file);
  return text === undefined ? undefined : splitFrontmatter(text).body;
}

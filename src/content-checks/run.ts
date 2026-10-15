import { join } from "node:path";
import type { Issue } from "./issue.ts";
import {
  FrontmatterError,
  listDirectories,
  readMarkdown,
  readMarkdownBody,
} from "./io.ts";
import { checkBody, checkStory, checkTitle } from "./text-checks.ts";

export interface ContentCheckOptions {
  /** 篇章內容目錄，每個子資料夾是一篇篇章。 */
  chaptersDir: string;
  /** 警告級發現（不影響通過與否）的接收者；未提供則不產生警告。 */
  onWarning?: (warning: Issue) => void;
}

/** 讀檔失敗（權限、路徑是資料夾等）轉成硬性問題，保留系統的原始訊息。 */
const readFailure = (file: string, error: unknown): Issue => ({
  file,
  message: `無法讀取：${error instanceof Error ? error.message : String(error)}`,
});

/** 檢查單一篇章資料夾；draft 與否不影響檢查。 */
function checkChapter(dir: string): Issue[] {
  const issues: Issue[] = [];

  const chapterFile = join(dir, "chapter.md");
  try {
    const chapter = readMarkdown(chapterFile);
    if (!chapter) {
      issues.push({ file: chapterFile, message: "找不到 chapter.md。" });
    } else {
      const title = (chapter.data as { title?: unknown } | null)?.title;
      issues.push(
        ...checkTitle(chapterFile, title),
        ...checkBody(chapterFile, chapter.body),
      );
    }
  } catch (error) {
    // 讀不到或 frontmatter 壞掉就沒有可靠的標題與內文，回報後仍繼續檢查 story.md。
    issues.push(
      error instanceof FrontmatterError
        ? { file: chapterFile, message: error.message }
        : readFailure(chapterFile, error),
    );
  }

  const storyFile = join(dir, "story.md");
  try {
    const story = readMarkdownBody(storyFile);
    if (story === undefined) {
      issues.push({
        file: storyFile,
        message: "找不到 story.md（故事開場口述稿）。",
      });
    } else {
      issues.push(...checkStory(storyFile, story));
    }
  } catch (error) {
    issues.push(readFailure(storyFile, error));
  }
  return issues;
}

/** 組合所有檢查；回傳硬性問題清單，空陣列代表通過。 */
export async function runContentChecks(
  options: ContentCheckOptions,
): Promise<Issue[]> {
  let slugs: string[] | null;
  try {
    slugs = listDirectories(options.chaptersDir);
  } catch (error) {
    return [readFailure(options.chaptersDir, error)];
  }
  if (!slugs) {
    return [
      {
        file: options.chaptersDir,
        message: "找不到篇章目錄（檢查 CHAPTERS_DIR）。",
      },
    ];
  }
  return slugs.flatMap((slug) => checkChapter(join(options.chaptersDir, slug)));
}

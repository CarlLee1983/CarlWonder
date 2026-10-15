import {
  createChapterSchema,
  nodeImage,
  type ChapterFrontmatter,
} from "../content/chapter-schema.ts";
import type { Issue } from "./issue.ts";

const chapterSchema = createChapterSchema(nodeImage);

/**
 * 用建置同一份 schema 驗 chapter.md 的 frontmatter，讓內容檢查先擋下 Astro 建置才會擋的錯。
 * 標題的問題由 checkTitle 回報（訊息更具體），這裡略過以免重複。
 */
export async function validateFrontmatter(
  file: string,
  data: unknown,
): Promise<
  | { data: ChapterFrontmatter; issues: [] }
  | { data?: undefined; issues: Issue[] }
> {
  const parsed = await chapterSchema.safeParseAsync(data ?? {});
  if (parsed.success) return { data: parsed.data, issues: [] };
  return {
    issues: parsed.error.issues
      .filter((issue) => issue.path[0] !== "title")
      .map((issue) => ({
        file,
        message: `frontmatter ${issue.path.join(".")}：${issue.message}`,
      })),
  };
}

import { z } from "astro/zod";

const nonEmpty = z.string().trim().min(1);

/** 篇章 frontmatter；YAML 日期會被解析成 Date，字串日期也接受。後續 ticket 再擴充圖片、參考資料等欄位。 */
export const chapterSchema = z.object({
  title: nonEmpty,
  summary: nonEmpty,
  draft: z.boolean(),
  publishedAt: z.coerce.date(),
});

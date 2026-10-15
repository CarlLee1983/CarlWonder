import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { chapterSchema } from "./content/chapter-schema";
import { assertChapterSlug } from "./content/chapter-slug";
import { contentLoaderBase } from "./content/content-dir";

// 內容根目錄由 CHAPTERS_DIR 決定：預設是正式內容，e2e 指向固定資料篇章（相對或絕對路徑皆可）。
const chapters = defineCollection({
  // 一篇篇章一個資料夾；識別值（即網址 slug）就是資料夾名稱，格式不合規即建置失敗。
  loader: glob({
    base: contentLoaderBase(process.env.CHAPTERS_DIR ?? "", "content/chapters"),
    pattern: "*/chapter.md",
    generateId: ({ entry }) => assertChapterSlug(entry.split("/")[0]!),
  }),
  schema: chapterSchema,
});

export const collections = { chapters };

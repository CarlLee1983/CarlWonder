import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { createChapterSchema } from "./content/chapter-schema";
import { assertChapterSlug } from "./content/chapter-slug";
import {
  contentLoaderBase,
  DEFAULT_CHAPTERS_DIR,
  resolveChaptersDir,
} from "./content/content-dir";

// 內容根目錄由 CHAPTERS_DIR 決定：預設是正式內容，e2e 指向固定資料篇章（相對或絕對路徑皆可）。
const chapters = defineCollection({
  // 一篇篇章一個資料夾；識別值（即網址 slug）就是資料夾名稱，格式不合規即建置失敗。
  loader: glob({
    base: contentLoaderBase(resolveChaptersDir(), DEFAULT_CHAPTERS_DIR),
    pattern: "*/chapter.md",
    generateId: ({ entry }) => assertChapterSlug(entry.split("/")[0]!),
  }),
  // image() 讓 family.anchorImage 由 Astro 解析成圖片中繼資料，不論 CHAPTERS_DIR 指到哪裡都能用。
  schema: ({ image }) => createChapterSchema(image),
});

export const collections = { chapters };

import { z } from "astro/zod";
import { EVIDENCE_LEVELS } from "./evidence-levels.ts";
import { IMAGE_TYPES } from "./image-types.ts";

const nonEmpty = z.string().trim().min(1);
/** 只接受 https：擋掉 `javascript:`、`data:` 與未加密的 `http:`。 */
const httpsUrl = z.url({ protocol: /^https$/ });

/**
 * 圖片：只驗形狀。「非自製圖必填 credit／license」「想像圖必填 basis／imagined」
 * 與授權清單屬於內容檢查，訊息才指得出是哪張圖。
 */
const imageSchema = z.object({
  file: nonEmpty,
  type: z.enum(IMAGE_TYPES),
  /** 圖說主文；想像圖可省略（固定句型由 basis 與 imagined 組成）。 */
  caption: nonEmpty.optional(),
  credit: z
    .object({
      author: nonEmpty,
      sourceUrl: httpsUrl,
      cropped: z.boolean().optional(),
    })
    .optional(),
  license: z.object({ name: nonEmpty, url: httpsUrl }).optional(),
  /** 想像圖的依據：證據文字與參考資料鍵。 */
  basis: z
    .object({ evidence: nonEmpty, refs: z.array(nonEmpty).min(1) })
    .optional(),
  /** 想像圖中哪些部分是猜的。 */
  imagined: nonEmpty.optional(),
});
export type ChapterImage = z.infer<typeof imageSchema>;

/** `YYYY-MM-DD` 字串且是真的存在的日期；不用 YAML 日期型別，避免時區位移，畫面原樣顯示。 */
const isoDate = z
  .string({
    error: (issue) =>
      issue.input instanceof Date
        ? '日期請加引號寫成 "YYYY-MM-DD"，否則 YAML 會讀成日期型別。'
        : undefined,
  })
  .refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    );
  }, "須是存在的日期，格式 YYYY-MM-DD（要加引號寫成字串）");

/** 參考資料鍵會進錨點 id（`ref-<key>`），所以只收小寫英文、數字與連字號。 */
const referenceKey = z
  .string()
  .regex(/^[a-z0-9-]+$/, "鍵只能用小寫英文、數字與連字號");

/** 參考資料（ADR 0002：公開列出）；year 是字串，可寫「公元前 54 年」。 */
const referenceSchema = z.object({
  key: referenceKey,
  author: nonEmpty,
  /** 可寫「公元前 54 年」，也可寫沒加引號的 2021（轉成字串）。 */
  year: z.union([nonEmpty, z.number()]).transform(String),
  title: nonEmpty,
  publisher: nonEmpty,
  url: httpsUrl,
  accessed: isoDate,
});
export type Reference = z.infer<typeof referenceSchema>;

/** 證據說明的一條主張；refs 是參考資料鍵，「已知至少一個」與鍵是否定義屬內容檢查。 */
const evidenceNoteSchema = z.object({
  claim: nonEmpty,
  level: z.enum(EVIDENCE_LEVELS),
  refs: z.array(nonEmpty).default([]),
});
export type EvidenceNote = z.infer<typeof evidenceNoteSchema>;

/** 篇章 frontmatter；YAML 日期會被解析成 Date，字串日期也接受。 */
export const chapterSchema = z.object({
  title: nonEmpty,
  summary: nonEmpty,
  draft: z.boolean(),
  publishedAt: z.coerce.date(),
  images: z.array(imageSchema).default([]),
  references: z.array(referenceSchema).default([]),
  lastChecked: isoDate,
  evidenceNotes: z.array(evidenceNoteSchema).default([]),
});

export type ChapterFrontmatter = z.infer<typeof chapterSchema>;

/** 圖片與參考資料這兩組欄位：內容檢查與 Markdown 外掛只讀這部分。 */
export const chapterMediaSchema = chapterSchema.pick({
  images: true,
  references: true,
});

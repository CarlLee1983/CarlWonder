import { z } from "astro/zod";
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

/** 參考資料：目前只需要鍵；其餘欄位（作者、年份…）之後補上，先放行。 */
const referenceSchema = z.looseObject({
  key: nonEmpty,
  url: httpsUrl.optional(),
});

/** 篇章 frontmatter；YAML 日期會被解析成 Date，字串日期也接受。 */
export const chapterSchema = z.object({
  title: nonEmpty,
  summary: nonEmpty,
  draft: z.boolean(),
  publishedAt: z.coerce.date(),
  images: z.array(imageSchema).default([]),
  references: z.array(referenceSchema).default([]),
});

/** 圖片與參考資料這兩組欄位：內容檢查與 Markdown 外掛只讀這部分。 */
export const chapterMediaSchema = chapterSchema.pick({
  images: true,
  references: true,
});

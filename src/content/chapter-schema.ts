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

/** 觀察提問的一格：基本題與標示「大一點的孩子」的延伸題，由家長自己挑。 */
const questionSchema = z.object({ basic: nonEmpty, older: nonEmpty });

/**
 * 親子共學（docs/writing-spec.md〈親子共學〉）：只驗形狀。
 * 錨點是否為實物照片、活動的分鐘與步數上限、adultRole 是否空白屬內容檢查，訊息才指得出原因。
 * `anchorImage` 保留 frontmatter 的檔名（與 `images[].file` 比對、取正文 alt 都要用），
 * 同時交給 `image()` 解析成圖片中繼資料，頁面不必另寫路徑解析；
 * 內容檢查在 node 下傳入字串替身（{@link nodeImage}）。
 */
const createFamilySchema = <A extends z.ZodType>(image: () => A) =>
  z.object({
    /** 指向 `images[].file` 之一，路徑相對於 chapter.md；alt 沿用正文該圖的 alt，不另存。 */
    anchorImage: nonEmpty.transform(async (file) => ({
      file,
      image: (await image().parseAsync(file)) as z.output<A>,
    })),
    questions: z.object({
      see: questionSchema,
      think: questionSchema,
      wonder: questionSchema,
    }),
    parentTips: z.array(nonEmpty).min(1),
    activity: z.object({
      name: nonEmpty,
      minutes: z.number().int().positive(),
      materials: z.array(nonEmpty).min(1),
      steps: z.array(nonEmpty).min(1),
      /** 「大人要做什麼」；不在 schema 擋空白，由內容檢查回報。 */
      adultRole: z.string(),
      /** 活動和篇章的關係，一句話。 */
      link: nonEmpty,
    }),
  });
/** 內容檢查看到的形狀：`anchorImage` 是 frontmatter 裡的路徑字串。 */
export type Family = z.infer<
  ReturnType<typeof createFamilySchema<z.ZodString>>
>;

const mediaShape = {
  images: z.array(imageSchema).default([]),
  references: z.array(referenceSchema).default([]),
};

/**
 * 篇章 frontmatter；YAML 日期會被解析成 Date，字串日期也接受。
 * 建置時 `image` 是 content collection 的 helper，內容檢查傳入 {@link nodeImage}。
 */
export const createChapterSchema = <A extends z.ZodType>(image: () => A) =>
  z.object({
    title: nonEmpty,
    summary: nonEmpty,
    draft: z.boolean(),
    publishedAt: z.coerce.date(),
    ...mediaShape,
    lastChecked: isoDate,
    evidenceNotes: z.array(evidenceNoteSchema).default([]),
    family: createFamilySchema(image),
  });

/** 內容檢查在 node 下的 `image()` 替身：只收路徑字串，檔案存在與否由內容檢查自己驗。 */
export const nodeImage = () => z.string().trim().min(1);

export type ChapterFrontmatter = z.infer<
  ReturnType<typeof createChapterSchema<ReturnType<typeof nodeImage>>>
>;

/** 圖片與參考資料這兩組欄位：Markdown 外掛只讀這部分。 */
export const chapterMediaSchema = z.object(mediaShape);

import type { ChapterImage } from "./chapter-schema.ts";

/** 出處行的一段：純文字，或帶連結的文字。 */
export interface CreditSegment {
  text: string;
  href?: string;
}

/**
 * 非自製圖的出處行「照片：作者，授權（經裁切）」，作者連原始檔案頁、授權連條款。
 * 正文圖說（Markdown 外掛）與觀察提問卡共用這一個產生函式；欄位已由內容檢查驗過。
 */
export function creditSegments(
  image: Pick<ChapterImage, "credit" | "license">,
): CreditSegment[] {
  const { credit, license } = image;
  if (!credit || !license) return [];
  return [
    { text: "照片：" },
    { text: credit.author, href: credit.sourceUrl },
    { text: "，" },
    { text: license.name, href: license.url },
    ...(credit.cropped ? [{ text: "（經裁切）" }] : []),
  ];
}

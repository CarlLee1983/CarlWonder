/** 圖片類型（CONTEXT.md〈圖片類型〉）；實物照片以外都要在頁面上標示。 */
export const IMAGE_TYPES = [
  "artifact-photo",
  "reconstruction",
  "replica-photo",
  "imagined",
] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

/** 給站主看的類型名稱（檢查訊息用）。 */
export const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  "artifact-photo": "實物照片",
  reconstruction: "研究重建圖",
  "replica-photo": "複製品照片",
  imagined: "想像圖",
};

/** 疊在圖片左上角的膠囊文字；實物照片沒有。alt 也以同一個字開頭（後接全形冒號）。 */
export const IMAGE_BADGES: Partial<Record<ImageType, string>> = {
  reconstruction: "研究重建",
  "replica-photo": "複製品",
  imagined: "想像圖",
};

/** 該類型的 alt 必須有的開頭；實物照片沒有要求。 */
export function altPrefix(type: ImageType): string | undefined {
  const badge = IMAGE_BADGES[type];
  return badge === undefined ? undefined : `${badge}：`;
}

/** 想像圖是自製圖，其餘三類都是他人的圖，須有出處與授權。 */
export const isSelfMade = (type: ImageType) => type === "imagined";

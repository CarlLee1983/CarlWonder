/**
 * 內容檢查的門檻都集中在這裡；規則本文在 docs/writing-spec.md。
 * 字數用 count-text.ts 的計字規則（中日韓字元各計 1、連續英數詞計 1）。
 */

/** 深入正文（「還不知道的事」之前的內文）字數區間。 */
export const BODY_LENGTH = { min: 3000, max: 5000 } as const;

/**
 * 故事開場（story.md）字數區間。
 * 這是由語速推估的起點；ticket 06 由安提基特拉樣章實測朗讀後校正，
 * 並與 docs/writing-spec.md 的字數在同一個變更裡修訂。
 */
export const STORY_LENGTH = { min: 450, max: 600 } as const;

/** 證據說明的條數區間。 */
export const EVIDENCE_NOTE_COUNT = { min: 5, max: 10 } as const;

/** 標題不得出現的字眼。 */
export const BANNED_TITLE_WORDS = ["驚人", "顛覆", "震驚"] as const;

/** 正文不得出現的句型。 */
export const BANNED_PHRASES = [
  "科學無法解釋",
  "科學家都嚇呆了",
  "證明了外星人",
] as const;

/** 正文最後一個 `##` 標題固定為此（同時也是正文計字的終點）。 */
export const FINAL_SECTION_HEADING = "還不知道的事";

/** 圖片檔：WebP、長邊像素、單檔上限。 */
export const IMAGE_FORMAT = "webp";
export const IMAGE_LONG_SIDE = 1536;
export const IMAGE_MAX_BYTES = 300 * 1024;

/** 想像圖寬:高 = 3:2；縮放時高度四捨五入，容許的像素誤差。 */
export const IMAGINED_ASPECT = { width: 3, height: 2, tolerancePx: 1 } as const;

/** 可用授權（ADR 0004）：任何含 ND 的都不在內；CC 授權只接受這幾個已發布的版本。 */
const CC_FAMILIES = ["CC BY", "CC BY-SA", "CC BY-NC", "CC BY-NC-SA"] as const;
const CC_VERSIONS = ["1.0", "2.0", "2.5", "3.0", "4.0"] as const;
export const ALLOWED_LICENSES: readonly string[] = [
  "CC0 1.0",
  "公有領域",
  ...CC_FAMILIES.flatMap((family) =>
    CC_VERSIONS.map((version) => `${family} ${version}`),
  ),
];
/** 給站主看的可用清單，由上面同一份資料產生。 */
export const LICENSE_HELP = `CC0 1.0、公有領域、${CC_FAMILIES.map(
  (family) => `${family} ${CC_VERSIONS.join("／")}`,
).join("、")}`;

/** 研究紀錄中須列出每個圖檔名的小節標題（`## 圖片`）。 */
export const RESEARCH_IMAGES_HEADING = "圖片";

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

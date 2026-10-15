import { countText } from "./count-text.ts";

/**
 * 篇章頁兩扇門顯示的時間估算。以下三個常數都是推估，不是實測：
 * - 大人默讀速度每分鐘 400 字；
 * - 故事朗讀每分鐘 175 字，依 docs/writing-spec.md 的 150–200 字／分推估，
 *   待 ticket 06 實測朗讀後校正，與 content-checks/thresholds.ts 的故事開場字數同一個變更修訂；
 * - 「看照片聊一聊」固定 5 分鐘。
 * 計字一律用 countText()，分鐘數無條件進位。
 */
export const ADULT_CHARS_PER_MINUTE = 400;
export const STORY_CHARS_PER_MINUTE = 175;
export const OBSERVATION_MINUTES = 5;

const minutesFor = (markdown: string, charsPerMinute: number) =>
  Math.ceil(countText(markdown) / charsPerMinute);

/** 大人讀完整篇深入正文（含「還不知道的事」）的分鐘數。 */
export const adultReadingMinutes = (body: string) =>
  minutesFor(body, ADULT_CHARS_PER_MINUTE);

/** 家長照稿唸完故事開場的分鐘數。 */
export const storyReadingMinutes = (story: string) =>
  minutesFor(story, STORY_CHARS_PER_MINUTE);

/** 親子共學三步驟的合計分鐘：唸故事＋看照片聊一聊＋動手做。 */
export const familyTotalMinutes = (story: string, activityMinutes: number) =>
  storyReadingMinutes(story) + OBSERVATION_MINUTES + activityMinutes;

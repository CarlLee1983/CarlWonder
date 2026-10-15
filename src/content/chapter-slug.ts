/** 篇章 slug（資料夾名，即網址）：英文小寫與數字，以單一連字號分段，例如 `giza-pyramids`。 */
export const CHAPTER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** slug 不合規就丟錯，讓建置失敗而不是靜默產出怪網址。 */
export function assertChapterSlug(slug: string): string {
  if (!CHAPTER_SLUG_PATTERN.test(slug)) {
    throw new Error(
      `篇章資料夾名「${slug}」不合規：只能用英文小寫、數字與連字號（例如 giza-pyramids）`,
    );
  }
  return slug;
}

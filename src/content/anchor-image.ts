import type { ImageMetadata } from "astro";
import type { ChapterImage } from "./chapter-schema.ts";
import { collectBodyImages } from "./body-images.ts";

/** frontmatter 與正文的圖片路徑相對於 chapter.md，去掉開頭 `./` 後與 `images[].file` 比對。 */
export const normalizeImageFile = (path: string) => path.replace(/^\.\//, "");

/**
 * 錨點圖在 `images` 裡對應的那一筆；內容檢查與頁面共用這一個判斷。
 * 找不到回傳 undefined（內容檢查據此回報）。
 */
export function findAnchorImage(
  images: readonly ChapterImage[],
  anchorImage: string,
): ChapterImage | undefined {
  const file = normalizeImageFile(anchorImage);
  return images.find((image) => image.file === file);
}

/** 觀察提問卡用的錨點實物照片：圖片中繼資料、正文該圖的 alt、frontmatter 的圖片資料（出處與授權）。 */
export interface AnchorPhoto {
  src: ImageMetadata;
  alt: string;
  image: ChapterImage;
}

/**
 * 組出頁面用的錨點照片。內容檢查已保證錨點是 `images` 中的實物照片、正文有引用且 alt 非空，
 * 所以找不到只代表檢查被繞過，直接中止建置。
 */
export function resolveAnchorPhoto(
  chapterId: string,
  anchor: { file: string; image: ImageMetadata },
  images: readonly ChapterImage[],
  body: string,
): AnchorPhoto {
  const image = findAnchorImage(images, anchor.file);
  const alt = collectBodyImages(body).find(
    (bodyImage) => bodyImage.file === normalizeImageFile(anchor.file),
  )?.alt;
  if (!image || !alt) {
    throw new Error(
      `篇章 ${chapterId} 的 family.anchorImage「${anchor.file}」不在 images 或正文裡（內容檢查應已擋下）。`,
    );
  }
  return { src: anchor.image, alt, image };
}

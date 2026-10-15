// 圖片規則的判斷與訊息只在這裡維護一份：內容檢查（回報給站主）與
// Markdown 外掛（不變式保險，檢查通過就不會觸發）共用。
import type { ChapterImage } from "../content/chapter-schema.ts";
import { IMAGE_TYPE_LABELS, isSelfMade } from "../content/image-types.ts";
import { undefinedReferenceKeys } from "./reference-rules.ts";
import { ALLOWED_LICENSES, LICENSE_HELP } from "./thresholds.ts";

export const imageNotListed = (file: string) =>
  `正文引用了圖片「${file}」，但 frontmatter images 沒有列出。`;

export const imageNotUsed = (file: string) =>
  `frontmatter images 列出了「${file}」，但正文沒有引用。`;

export const imageListedTwice = (file: string) =>
  `frontmatter images 重複列出「${file}」；每張圖只列一次。`;

export const imageMustBeStandalone = (file: string) =>
  `圖片「${file}」必須獨占一段（前後各空一行，同一段不能夾文字）。`;

export const imageMustFollowParagraph = (file: string) =>
  `圖片「${file}」必須接在它所屬的段落之後（前面不能是標題、清單、引用、程式碼，或文件開頭）。`;

export const referenceStyleImage = (alt: string) =>
  `不支援參考式圖片「![${alt}][…]」；請改用 ![alt](./x.webp)。`;

/**
 * 單張圖在 frontmatter 的必填欄位、禁用欄位與授權；`known` 是參考資料鍵 → 編號。
 * 回傳每一項問題的訊息，空陣列代表合規。
 */
export function imageFieldProblems(
  image: ChapterImage,
  known: ReadonlyMap<string, number>,
): string[] {
  const problems: string[] = [];
  const label = IMAGE_TYPE_LABELS[image.type];

  if (isSelfMade(image.type)) {
    if (image.caption) {
      problems.push(
        `想像圖「${image.file}」不得有 caption；圖說固定為「依據：…想像部分：…」兩句，由 basis 與 imagined 組成。`,
      );
    }
    if (!image.basis) {
      problems.push(
        `想像圖「${image.file}」缺少 basis（依據的證據與參考資料）。`,
      );
    } else {
      for (const key of undefinedReferenceKeys(image.basis.refs, known)) {
        problems.push(
          `想像圖「${image.file}」的 basis.refs 指向不存在的參考資料鍵「${key}」。`,
        );
      }
    }
    if (!image.imagined) {
      problems.push(`想像圖「${image.file}」缺少 imagined（想像的部分）。`);
    }
    return problems;
  }

  if (!image.caption) {
    problems.push(`圖片「${image.file}」（${label}）缺少 caption（圖說）。`);
  }
  if (!image.credit) {
    problems.push(
      `圖片「${image.file}」（${label}）是非自製圖，缺少 credit（作者與原始檔案頁）。`,
    );
  }
  if (!image.license) {
    problems.push(
      `圖片「${image.file}」（${label}）是非自製圖，缺少 license（授權名稱與條款連結）。`,
    );
  } else if (!ALLOWED_LICENSES.includes(image.license.name)) {
    problems.push(
      `圖片「${image.file}」的授權「${image.license.name}」不在可用清單：${LICENSE_HELP}。`,
    );
  }
  return problems;
}

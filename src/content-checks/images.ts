import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  chapterMediaSchema,
  type ChapterImage,
} from "../content/chapter-schema.ts";
import { altPrefix } from "../content/image-types.ts";
import { referenceNumbers } from "../content/reference-numbers.ts";
import {
  imageFieldProblems,
  imageListedTwice,
  imageMustBeStandalone,
  imageMustFollowParagraph,
  imageNotListed,
  imageNotUsed,
  referenceStyleImage,
} from "./image-rules.ts";
import type { Issue } from "./issue.ts";
import { h2Headings, maskCodeFences, splitBlocks } from "./markdown-source.ts";
import {
  IMAGE_FORMAT,
  IMAGE_LONG_SIDE,
  IMAGE_MAX_BYTES,
  IMAGINED_ASPECT,
  RESEARCH_IMAGES_HEADING,
} from "./thresholds.ts";

/** HTML 註解不顯示給讀者，裡面的圖片語法不算引用。 */
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
/** 標準圖片語法 `![alt](src "title")`。 */
const BODY_IMAGE = /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;

interface BodyImage {
  /** 去掉開頭 `./` 的路徑，與 images[].file 比對。 */
  file: string;
  alt: string;
}

/** 正文引用的圖片（略過程式碼區塊與註解），依出現順序。 */
function collectBodyImages(body: string): BodyImage[] {
  return [...visibleText(body).matchAll(BODY_IMAGE)].map((match) => ({
    alt: match[1]!,
    file: match[2]!.replace(/^\.\//, ""),
  }));
}

/** 去掉程式碼區塊與 HTML 註解（換成等長空白）後的正文。 */
const visibleText = (body: string) =>
  maskCodeFences(body).replace(HTML_COMMENT, (m) => " ".repeat(m.length));

/** 參考式圖片 `![alt][ref]`：不支援，外掛只認內嵌語法。 */
const REFERENCE_IMAGE = /!\[([^\]]*)\]\[[^\]]*\]/g;
/** 區塊整段就是一張圖。 */
const IMAGE_ONLY = new RegExp(`^${BODY_IMAGE.source}$`);
/** 這些開頭的區塊不是普通段落：標題、引用、清單、表格、HTML、程式碼、分隔線、連結定義。 */
const NOT_A_PARAGRAPH =
  /^(?: {4}|\t|\s{0,3}(?:#{1,6}(?:\s|$)|>|[-*+]\s|\d+[.)]\s|\||<|`{3,}|~{3,}|(?:[-*_][ \t]*){3,}$|\[[^\]]+\]:))/;

/**
 * 圖片版面規則：每張圖獨占一段，且接在它所屬的段落之後
 * （一個段落後面可以接連多張圖）。回傳違規訊息。
 */
function checkImageLayout(body: string): string[] {
  const problems: string[] = [];
  let ownerIsParagraph = false;
  for (const block of splitBlocks(body)) {
    const alone = IMAGE_ONLY.exec(block);
    if (alone) {
      const file = alone[2]!.replace(/^\.\//, "");
      if (!ownerIsParagraph) problems.push(imageMustFollowParagraph(file));
      continue;
    }
    ownerIsParagraph = !NOT_A_PARAGRAPH.test(block);
    for (const match of visibleText(block).matchAll(BODY_IMAGE)) {
      problems.push(imageMustBeStandalone(match[2]!.replace(/^\.\//, "")));
    }
  }
  return problems;
}

interface ImageFileInfo {
  format?: string;
  width?: number;
  height?: number;
  bytes: number;
}

/** 檔案不存在回傳 null；存在但 sharp 讀不了就丟出（呼叫端轉成問題）。 */
async function readImageInfo(path: string): Promise<ImageFileInfo | null> {
  if (!existsSync(path)) return null;
  const { format, width, height } = await sharp(path).metadata();
  return { format, width, height, bytes: statSync(path).size };
}

/** 圖檔本身的規格：WebP、長邊、大小，想像圖另加 3:2。`info` 為 null 代表檔案不存在。 */
function checkImageFile(
  file: string,
  image: ChapterImage,
  info: ImageFileInfo | null,
): Issue[] {
  const issue = (message: string): Issue => ({ file, message });
  if (!info) return [issue("找不到圖片檔。")];

  const issues: Issue[] = [];
  const { width, height } = info;
  if (info.format !== IMAGE_FORMAT) {
    issues.push(
      issue(`圖片必須是 WebP，實際為 ${info.format ?? "無法辨識"}。`),
    );
  }
  if (Math.max(width ?? 0, height ?? 0) !== IMAGE_LONG_SIDE) {
    issues.push(
      issue(
        `圖片長邊必須是 ${IMAGE_LONG_SIDE} px，實際為 ${width ?? "?"}×${height ?? "?"}。`,
      ),
    );
  }
  if (info.bytes > IMAGE_MAX_BYTES) {
    issues.push(
      issue(
        `圖片不得超過 ${IMAGE_MAX_BYTES / 1024} KB，實際為 ${Math.ceil(info.bytes / 1024)} KB。`,
      ),
    );
  }
  if (image.type === "imagined" && width && height) {
    const { width: w, height: h, tolerancePx } = IMAGINED_ASPECT;
    if (Math.abs(height - (width * h) / w) > tolerancePx) {
      issues.push(
        issue(`想像圖必須是 ${w}:${h}（寬:高），實際為 ${width}×${height}。`),
      );
    }
  }
  return issues;
}

/** 正文引用處的 alt：一律必填，非實物照片冠上類型。 */
function checkAlt(file: string, image: ChapterImage, alt: string): Issue[] {
  if (alt.trim() === "") {
    return [
      {
        file,
        message: `圖片「${image.file}」的 alt 空白；需描述圖中實際看得到的東西。`,
      },
    ];
  }
  const prefix = altPrefix(image.type);
  if (prefix !== undefined && !alt.trim().startsWith(prefix)) {
    return [
      { file, message: `圖片「${image.file}」的 alt 需以「${prefix}」開頭。` },
    ];
  }
  return [];
}

interface ChapterImageResult {
  issues: Issue[];
  /** frontmatter 列出的圖檔名；schema 錯誤時為空。 */
  files: string[];
}

/**
 * chapter.md 的圖片檢查：frontmatter 形狀、正文與 images 一一對應、出處授權、
 * alt、想像圖依據、圖檔規格。`dir` 是篇章資料夾（圖檔與 chapter.md 同處）。
 */
export async function checkChapterImages(
  chapterFile: string,
  dir: string,
  data: unknown,
  body: string,
): Promise<ChapterImageResult> {
  const parsed = chapterMediaSchema.safeParse(data ?? {});
  if (!parsed.success) {
    return {
      files: [],
      issues: parsed.error.issues.map((issue) => ({
        file: chapterFile,
        message: `frontmatter ${issue.path.join(".")}：${issue.message}`,
      })),
    };
  }
  const { images, references } = parsed.data;
  const known = referenceNumbers(references);
  const bodyImages = collectBodyImages(body);
  const listed = new Set(images.map((image) => image.file));
  const referenced = new Set(bodyImages.map((image) => image.file));

  const issues: Issue[] = [];
  const add = (message: string) => issues.push({ file: chapterFile, message });
  for (const file of referenced) {
    if (!listed.has(file)) add(imageNotListed(file));
  }
  for (const file of listed) {
    if (!referenced.has(file)) add(imageNotUsed(file));
  }
  const counts = Map.groupBy(images, (image) => image.file);
  for (const [file, entries] of counts) {
    if (entries.length > 1) add(imageListedTwice(file));
  }
  for (const match of visibleText(body).matchAll(REFERENCE_IMAGE)) {
    add(referenceStyleImage(match[1]!));
  }
  checkImageLayout(body).forEach(add);

  for (const image of images) {
    imageFieldProblems(image, known).forEach(add);
    for (const ref of bodyImages.filter((b) => b.file === image.file)) {
      issues.push(...checkAlt(chapterFile, image, ref.alt));
    }
    const path = join(dir, image.file);
    try {
      issues.push(...checkImageFile(path, image, await readImageInfo(path)));
    } catch (error) {
      issues.push({
        file: path,
        message: `無法讀取圖片：${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return { issues, files: images.map((image) => image.file) };
}

/** 檔名要完整出現：前後不能緊接檔名字元（`old-a.webp` 不算列出 `a.webp`）。 */
function mentionsFile(text: string, file: string): boolean {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w.-])${escaped}(?![\\w-])`).test(text);
}

/** 研究紀錄：缺檔，或有圖片卻沒有「## 圖片」一節、節內漏列圖檔名。`body` 為 undefined 代表檔案不存在。 */
export function checkResearch(
  file: string,
  body: string | undefined,
  imageFiles: string[],
): Issue[] {
  if (body === undefined) return [{ file, message: "找不到研究紀錄。" }];
  if (imageFiles.length === 0) return [];

  const headings = h2Headings(body);
  const at = headings.findIndex((h) => h.text === RESEARCH_IMAGES_HEADING);
  if (at === -1) {
    return [
      {
        file,
        message: `研究紀錄找不到「## ${RESEARCH_IMAGES_HEADING}」一節。`,
      },
    ];
  }
  const start = headings[at]!.index + headings[at]!.length;
  const section = body.slice(start, headings[at + 1]?.index ?? body.length);
  return imageFiles
    .filter((name) => !mentionsFile(section, name))
    .map((name) => ({
      file,
      message: `研究紀錄的「${RESEARCH_IMAGES_HEADING}」一節沒有列出圖檔「${name}」。`,
    }));
}

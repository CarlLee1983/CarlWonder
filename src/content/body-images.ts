import { maskCodeFences } from "./markdown-source.ts";

/** HTML 註解不顯示給讀者，裡面的圖片語法不算引用。 */
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
/** 標準圖片語法 `![alt](src "title")`。 */
export const BODY_IMAGE = /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;

export interface BodyImage {
  /** 去掉開頭 `./` 的路徑，與 images[].file 比對。 */
  file: string;
  alt: string;
}

/** 正文引用的圖片（略過程式碼區塊與註解），依出現順序。 */
export function collectBodyImages(body: string): BodyImage[] {
  return [...visibleText(body).matchAll(BODY_IMAGE)].map((match) => ({
    alt: match[1]!,
    file: match[2]!.replace(/^\.\//, ""),
  }));
}

/** 去掉程式碼區塊與 HTML 註解（換成等長空白）後的正文。 */
export const visibleText = (body: string) =>
  maskCodeFences(body).replace(HTML_COMMENT, (m) => " ".repeat(m.length));

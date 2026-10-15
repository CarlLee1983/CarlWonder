import { pathToFileURL } from "node:url";

/** 篇章內容的預設目錄（未設定 CHAPTERS_DIR 時）；內容集合與內容檢查共用。 */
export const DEFAULT_CHAPTERS_DIR = "content/chapters";

/**
 * 內容集合 glob loader 的 base：相對路徑相對於專案根目錄；`dir` 為空字串時用 `defaultDir`。
 * 絕對路徑要轉成檔案 URL，否則拼成 `./` 開頭會變成指向錯誤位置的相對路徑，靜默產出空站。
 */
export function contentLoaderBase(
  dir: string,
  defaultDir: string,
): string | URL {
  const resolved = dir || defaultDir;
  return resolved.startsWith("/") ? pathToFileURL(resolved) : `./${resolved}`;
}

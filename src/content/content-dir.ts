import { pathToFileURL } from "node:url";

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

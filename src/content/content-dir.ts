import { pathToFileURL } from "node:url";

/** 篇章內容的預設目錄（未設定 CHAPTERS_DIR 時）；內容集合與內容檢查共用。 */
export const DEFAULT_CHAPTERS_DIR = "content/chapters";

/** 研究紀錄（查核紀錄）的預設目錄（未設定 RESEARCH_DIR 時）；內容檢查用，每篇是 `<slug>.md`。 */
const DEFAULT_RESEARCH_DIR = "docs/research";

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

/** 篇章目錄：環境變數 CHAPTERS_DIR，未設定（或空字串）用預設。內容集合、內容檢查與 Markdown 外掛共用。 */
export const resolveChaptersDir = (env: NodeJS.ProcessEnv = process.env) =>
  env.CHAPTERS_DIR || DEFAULT_CHAPTERS_DIR;

/** 研究紀錄目錄：環境變數 RESEARCH_DIR，未設定（或空字串）用預設。 */
export const resolveResearchDir = (env: NodeJS.ProcessEnv = process.env) =>
  env.RESEARCH_DIR || DEFAULT_RESEARCH_DIR;

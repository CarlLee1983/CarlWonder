/** HTML 註解：不顯示給讀者，整段不計。 */
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
/** 圖片 `![alt](url)`：整段不計，換成空白以免左右的詞黏在一起。 */
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
/** 連結 `[文字](url)`：只留文字。 */
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
/** 參考式連結定義整行 `[ref]: url "title"`（腳註 `[^1]:` 是正文，不在此列）。 */
const REFERENCE_DEFINITION = /^ {0,3}\[(?!\^)[^\]\n]+\]:[^\n]*$/gm;
/** 裸網址（含 `<https://…>` 的內容）：只吃 ASCII 可見字元，才不會連後面的中文一起吃掉。 */
const BARE_URL = /https?:\/\/[\x21-\x7E]+/g;

/** 中日韓字元：漢字、假名、注音、諺文；長音符號 `ー` 的腳本是 Common，要另外列。 */
const CJK =
  "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Bopomofo}\\p{Script=Hangul}\\u30FC";
/** 詞字元：任何文字的字母或數字，但不含上面的中日韓字元（希臘、西里爾等與拉丁字母同樣成詞）。 */
const WORD = `[[\\p{L}\\p{Nd}]--[${CJK}]]`;

/**
 * 計字單位二選一，其餘（標點、空白、Markdown 符號）不符合任何一種，自然不計：
 * - 一個中日韓字元（見 CJK）。
 * - 一個詞：連續的非中日韓字母或數字；內部可有單個 `.`、`-`、`'`（`3.5`、`X-ray`、`don't`），
 *   數字之間可有千分位逗號（`3,000`、`100,000`），整串仍計 1。
 */
const UNIT = new RegExp(
  `[${CJK}]|${WORD}+(?:(?:\\.|-|')${WORD}+|(?<=[0-9]),[0-9]{3}(?![0-9]))*`,
  "gv",
);

/**
 * 內容檢查唯一的計字規則：正文與故事開場共用。
 * 先移除不顯示或不屬於文字的部分：HTML 註解、圖片整段、參考式連結定義行、裸網址，
 * 連結 `[文字](url)` 只留文字；再依 UNIT 數出中日韓字元與詞。
 */
export function countText(markdown: string): number {
  const text = markdown
    .replace(HTML_COMMENT, " ")
    .replace(IMAGE, " ")
    .replace(LINK, "$1")
    .replace(REFERENCE_DEFINITION, " ")
    .replace(BARE_URL, " ");
  return text.match(UNIT)?.length ?? 0;
}

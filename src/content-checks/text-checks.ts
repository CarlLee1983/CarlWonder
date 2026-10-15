import { countText } from "./count-text.ts";
import type { Issue } from "./issue.ts";
import {
  BANNED_PHRASES,
  BANNED_TITLE_WORDS,
  BODY_LENGTH,
  FINAL_SECTION_HEADING,
  STORY_LENGTH,
} from "./thresholds.ts";

const formatCount = (n: number) => n.toLocaleString("en-US");

/** 二級標題：恰好兩個 `#` 後接空白（三級以下不符合），可有結尾的 `##` 收尾記號。 */
const H2 = /^##[ \t]+(\S.*?)(?:[ \t]+#+)?[ \t]*$/gm;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/** 把圍欄程式碼區塊的內容換成空白（保留換行與總長度），讓標題比對不會誤認程式碼裡的 `##`，位置仍對得上原文。 */
function maskCodeFences(body: string): string {
  let fence: string | null = null;
  return body
    .split("\n")
    .map((line) => {
      const opening = FENCE.exec(line)?.[1];
      if (fence === null) {
        if (!opening) return line;
        fence = opening;
      } else if (
        opening !== undefined &&
        opening[0] === fence[0] &&
        opening.length >= fence.length
      ) {
        fence = null;
      }
      return line.replace(/[^\r]/g, " ");
    })
    .join("\n");
}

/** 字數必須落在區間內；訊息帶實際值與門檻。 */
function checkRange(
  file: string,
  label: string,
  length: number,
  range: { min: number; max: number },
): Issue[] {
  if (length >= range.min && length <= range.max) return [];
  return [
    {
      file,
      message: `${label} ${formatCount(length)} 字，需 ${formatCount(range.min)}–${formatCount(range.max)} 字。`,
    },
  ];
}

/** 標題須為「X：Y」（全形冒號，前後都有文字）且不含誇張字眼。 */
export function checkTitle(file: string, title: unknown): Issue[] {
  if (typeof title !== "string" || title.trim() === "") {
    return [{ file, message: "frontmatter 缺少 title 欄位，或不是文字。" }];
  }
  const issues: Issue[] = [];
  const colon = title.indexOf("：");
  if (
    colon === -1 ||
    title.slice(0, colon).trim() === "" ||
    title.slice(colon + 1).trim() === ""
  ) {
    issues.push({
      file,
      message: `標題「${title}」不是「X：Y」格式（需要全形冒號「：」，且前後都要有文字）。`,
    });
  }
  for (const word of BANNED_TITLE_WORDS) {
    if (title.includes(word)) {
      issues.push({ file, message: `標題「${title}」含禁用字「${word}」。` });
    }
  }
  return issues;
}

/** chapter.md 內文：字數、最後的二級標題、禁用句型。 */
export function checkBody(file: string, body: string): Issue[] {
  const issues: Issue[] = [];
  const headings = [...maskCodeFences(body).matchAll(H2)];
  const last = headings.at(-1);

  // 最後一個 ## 是「還不知道的事」時，正文是它之前的全部；否則計全文（那一項另行失敗）。
  const counted =
    last?.[1] === FINAL_SECTION_HEADING ? body.slice(0, last.index) : body;
  issues.push(...checkRange(file, "正文", countText(counted), BODY_LENGTH));

  if (last?.[1] !== FINAL_SECTION_HEADING) {
    issues.push({
      file,
      message: last
        ? `最後一個 ## 標題是「${last[1]}」，需為「${FINAL_SECTION_HEADING}」。`
        : `沒有任何 ## 標題，最後一個 ## 標題需為「${FINAL_SECTION_HEADING}」。`,
    });
  }

  for (const phrase of BANNED_PHRASES) {
    if (body.includes(phrase)) {
      issues.push({ file, message: `正文含禁用句型「${phrase}」。` });
    }
  }
  return issues;
}

/** story.md 內文：字數。 */
export function checkStory(file: string, body: string): Issue[] {
  return checkRange(file, "故事開場", countText(body), STORY_LENGTH);
}

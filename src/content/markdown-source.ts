const FENCE = /^ {0,3}(`{3,}|~{3,})/;
/** 二級標題：恰好兩個 `#` 後接空白（三級以下不符合），可有結尾的 `##` 收尾記號。 */
const H2 = /^##[ \t]+(\S.*?)(?:[ \t]+#+)?[ \t]*$/gm;

/** 每一行是否屬於圍欄程式碼區塊（含開頭與結尾的圍欄行）。 */
function fenceFlags(lines: string[]): boolean[] {
  let fence: string | null = null;
  return lines.map((line) => {
    const opening = FENCE.exec(line)?.[1];
    if (fence === null) {
      if (!opening) return false;
      fence = opening;
    } else if (
      opening !== undefined &&
      opening[0] === fence[0] &&
      opening.length >= fence.length
    ) {
      fence = null;
    }
    return true;
  });
}

/** 把圍欄程式碼區塊的內容換成空白（保留換行與總長度），讓比對不會誤認程式碼裡的內容，位置仍對得上原文。 */
export function maskCodeFences(body: string): string {
  const lines = body.split("\n");
  const flags = fenceFlags(lines);
  return lines
    .map((line, i) => (flags[i] ? line.replace(/[^\r]/g, " ") : line))
    .join("\n");
}

/** 以空行切成區塊（圍欄程式碼區塊內的空行不切），每個區塊是去掉頭尾空白的原文。 */
export function splitBlocks(body: string): string[] {
  const lines = body.split("\n");
  const flags = fenceFlags(lines);
  const blocks: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) blocks.push(current.join("\n").trim());
    current = [];
  };
  lines.forEach((line, i) => {
    if (!flags[i] && line.trim() === "") flush();
    else current.push(line);
  });
  flush();
  return blocks;
}

interface Heading {
  text: string;
  /** 標題行在原文中的起點與長度。 */
  index: number;
  length: number;
}

/** 正文裡的二級標題（略過程式碼區塊），依出現順序。 */
export function h2Headings(body: string): Heading[] {
  return [...maskCodeFences(body).matchAll(H2)].map((match) => ({
    text: match[1]!,
    index: match.index,
    length: match[0].length,
  }));
}

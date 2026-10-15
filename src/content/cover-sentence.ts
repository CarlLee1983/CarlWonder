/**
 * 封面那一句。標題在全形冒號之後的問句才上封面；
 * 照片嵌在兩個詞之間，冒號前的物件名仍留在篇章標題。
 */
export function coverSentence(title: string): {
  before: string;
  after: string;
} {
  const question = (title.split("：").at(-1) ?? title).trim();
  const mark = question.endsWith("？") ? "？" : "";
  const bare = mark ? question.slice(0, -1) : question;
  if (bare.length < 2) return { before: question, after: "" };

  for (const particle of ["的", "了", "是"]) {
    const at = bare.indexOf(particle);
    const afterLength = bare.length - (at + 1);
    if (at >= 2 && afterLength >= 2) {
      return {
        before: bare.slice(0, at + 1),
        after: `${bare.slice(at + 1)}${mark}`,
      };
    }
  }

  const mid = Math.ceil(bare.length / 2);
  return { before: bare.slice(0, mid), after: `${bare.slice(mid)}${mark}` };
}

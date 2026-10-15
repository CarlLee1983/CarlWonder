/**
 * 參考資料鍵 → 顯示編號：依清單順序從 1 起。圖說與證據說明共用這一個來源，
 * 調整清單順序編號就跟著變。鍵重複時以第一次出現為準（重複本身由內容檢查回報）。
 */
export function referenceNumbers(
  references: readonly { key: string }[],
): ReadonlyMap<string, number> {
  const numbers = new Map<string, number>();
  references.forEach(({ key }, index) => {
    if (!numbers.has(key)) numbers.set(key, index + 1);
  });
  return numbers;
}

/** 參考資料條目的錨點 id；編號連結的 href 是 `#` 加上它。 */
export const referenceAnchor = (key: string) => `ref-${key}`;

/** 文中的編號標記：〔n〕。 */
export const referenceMark = (number: number) => `〔${number}〕`;

/** 取鍵的編號；取不到代表內容檢查被繞過，直接丟錯，不讓畫面顯示 undefined。`where` 指出是哪裡引用的。 */
export function requireReferenceNumber(
  numbers: ReadonlyMap<string, number>,
  key: string,
  where: string,
): number {
  const number = numbers.get(key);
  if (number === undefined) {
    throw new Error(`${where}：參考資料鍵「${key}」未定義。`);
  }
  return number;
}

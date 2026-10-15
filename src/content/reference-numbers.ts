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

// 參考資料鍵的判斷只在這裡維護一份：想像圖的 basis.refs 與證據說明的 refs 共用，
// 各自的訊息（指出是哪張圖、哪一條）留在使用處。

/** `keys` 中沒有定義在 `known`（參考資料鍵 → 編號）裡的鍵，依出現順序、不重複。 */
export function undefinedReferenceKeys(
  keys: readonly string[],
  known: ReadonlyMap<string, number>,
): string[] {
  return [...new Set(keys)].filter((key) => !known.has(key));
}

/** 在參考資料清單中出現不只一次的鍵，依第一次出現的順序。 */
export function duplicateReferenceKeys(
  references: readonly { key: string }[],
): string[] {
  const counts = Map.groupBy(references, ({ key }) => key);
  return [...counts]
    .filter(([, entries]) => entries.length > 1)
    .map(([key]) => key);
}

/** 證據等級（CONTEXT.md〈證據等級〉）；單軸四級，取捨見 ADR 0003。 */
export const EVIDENCE_LEVELS = [
  "known",
  "inferred",
  "legend",
  "unknown",
] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

/** 畫面與檢查訊息共用的等級名稱；只用文字標籤，不加徽章或符號。 */
export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  known: "已知",
  inferred: "推論",
  legend: "傳說",
  unknown: "未知",
};

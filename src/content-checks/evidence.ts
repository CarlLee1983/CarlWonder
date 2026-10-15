import type { EvidenceNote, Reference } from "../content/chapter-schema.ts";
import { EVIDENCE_LEVEL_LABELS } from "../content/evidence-levels.ts";
import { referenceNumbers } from "../content/reference-numbers.ts";
import type { Issue } from "./issue.ts";
import {
  duplicateReferenceKeys,
  undefinedReferenceKeys,
} from "./reference-rules.ts";
import { EVIDENCE_NOTE_COUNT } from "./thresholds.ts";

/**
 * 參考資料與證據說明：鍵不重複、證據說明 refs 都有定義、條數在區間內、
 * 「已知」至少一個 ref。欄位形狀已由 frontmatter schema 驗過。
 */
export function checkEvidence(
  file: string,
  references: readonly Reference[],
  notes: readonly EvidenceNote[],
): Issue[] {
  const issues: Issue[] = [];
  const add = (message: string) => issues.push({ file, message });

  for (const key of duplicateReferenceKeys(references)) {
    add(`參考資料鍵「${key}」重複；每個鍵只能出現一次。`);
  }
  if (
    notes.length < EVIDENCE_NOTE_COUNT.min ||
    notes.length > EVIDENCE_NOTE_COUNT.max
  ) {
    add(
      `證據說明 ${notes.length} 條，需 ${EVIDENCE_NOTE_COUNT.min}–${EVIDENCE_NOTE_COUNT.max} 條。`,
    );
  }
  const known = referenceNumbers(references);
  notes.forEach((note, index) => {
    const nth = `證據說明第 ${index + 1} 條`;
    for (const key of undefinedReferenceKeys(note.refs, known)) {
      add(`${nth}的 refs 指向不存在的參考資料鍵「${key}」。`);
    }
    if (note.level === "known" && note.refs.length === 0) {
      add(
        `${nth}（${EVIDENCE_LEVEL_LABELS.known}）沒有任何參考資料；${EVIDENCE_LEVEL_LABELS.known}至少要有一個 refs。`,
      );
    }
  });
  return issues;
}

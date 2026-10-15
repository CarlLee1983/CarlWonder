import { findAnchorImage } from "../content/anchor-image.ts";
import type { ChapterImage, Family } from "../content/chapter-schema.ts";
import { IMAGE_TYPE_LABELS } from "../content/image-types.ts";
import type { Issue } from "./issue.ts";
import {
  ACTIVITY_FORBIDDEN,
  ACTIVITY_LIMITS,
  ACTIVITY_SMALL_PARTS,
} from "./thresholds.ts";

/** 活動裡會被掃描禁用關鍵字的欄位，順序即警告中列出欄位的順序。 */
function activityTexts(activity: Family["activity"]) {
  return [
    ["activity.name", activity.name],
    ["activity.materials", activity.materials.join("\n")],
    ["activity.steps", activity.steps.join("\n")],
    ["activity.adultRole", activity.adultRole],
  ] as const;
}

/**
 * 親子共學（frontmatter 已驗過形狀）：錨點必須是 images 中的實物照片、
 * 活動分鐘與步數上限、adultRole 非空。
 */
export function checkFamily(
  file: string,
  family: Family,
  images: readonly ChapterImage[],
): Issue[] {
  const issues: Issue[] = [];
  const add = (message: string) => issues.push({ file, message });
  const { activity } = family;
  const anchorImage = family.anchorImage.file;

  const anchor = findAnchorImage(images, anchorImage);
  if (!anchor) {
    add(
      `family.anchorImage「${anchorImage}」不在 frontmatter images 裡；錨點必須是 images 中的實物照片。`,
    );
  } else if (anchor.type !== "artifact-photo") {
    add(
      `family.anchorImage「${anchorImage}」是${IMAGE_TYPE_LABELS[anchor.type]}，錨點必須是實物照片。`,
    );
  }

  if (activity.minutes > ACTIVITY_LIMITS.maxMinutes) {
    add(
      `活動 minutes 為 ${activity.minutes}，不得超過 ${ACTIVITY_LIMITS.maxMinutes} 分鐘。`,
    );
  }
  if (activity.steps.length > ACTIVITY_LIMITS.maxSteps) {
    add(
      `活動有 ${activity.steps.length} 個步驟，不得超過 ${ACTIVITY_LIMITS.maxSteps} 步。`,
    );
  }
  if (activity.adultRole.trim() === "") {
    add("活動的 adultRole（大人要做什麼）空白；必填。");
  }
  return issues;
}

/**
 * 活動的警告（不擋建置）：
 * - 文字含禁用清單關鍵字：每個命中的關鍵字一則，訊息列出它出現的所有欄位與對應的禁用規則；
 * - 材料含小件物品：每個命中的詞一則，提醒確認已寫明家長收好。
 */
export function activityWarnings(file: string, family: Family): Issue[] {
  const texts = activityTexts(family.activity);
  const materials = family.activity.materials.join("\n");
  const smallParts = ACTIVITY_SMALL_PARTS.filter((word) =>
    materials.includes(word),
  ).map((word) => ({
    file,
    message: `活動的 activity.materials 含「${word}」，請確認已寫明提醒家長收好、不讓年幼的弟妹拿到（docs/writing-spec.md〈家庭探索活動〉）。`,
  }));
  const forbidden = ACTIVITY_FORBIDDEN.flatMap(({ keyword, rule }) => {
    const fields = texts
      .filter(([, text]) => text.includes(keyword))
      .map(([field]) => field);
    return fields.length === 0
      ? []
      : [
          {
            file,
            message: `活動的 ${fields.join("、")} 含禁用清單關鍵字「${keyword}」，對應 docs/writing-spec.md〈家庭探索活動〉禁用清單「${rule}」；請確認活動是否仍安全。`,
          },
        ];
  });
  return [...forbidden, ...smallParts];
}

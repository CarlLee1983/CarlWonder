import { getCollection } from "astro:content";

/** 草稿只在開發模式顯示，方便站主預覽；正式建置一律排除。 */
export function getVisibleChapters() {
  return getCollection(
    "chapters",
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
}

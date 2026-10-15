import type { ChapterImage } from "../content/chapter-schema.ts";
import { IMAGE_BADGES, isSelfMade } from "../content/image-types.ts";
import { imageFieldProblems } from "../content-checks/image-rules.ts";

type Property = string | number | boolean | (string | number)[];
interface Text {
  type: "text";
  value: string;
}
export interface Element {
  type: "element";
  tagName: string;
  properties: Record<string, Property>;
  children: (Element | Text)[];
}

const text = (value: string): Text => ({ type: "text", value });
const element = (
  tagName: string,
  properties: Record<string, Property>,
  children: (Element | Text)[],
): Element => ({ type: "element", tagName, properties, children });

const link = (href: string, label: string) =>
  element("a", { href }, [text(label)]);

/** 圖片的響應式 sizes：寬螢幕在 17.5rem 的旁欄，窄螢幕占滿正文欄（最寬 40rem）。 */
export const FIGURE_IMAGE_SIZES =
  "(min-width: 62rem) 17.5rem, min(100vw - 2.5rem, 40rem)";

/** 想像圖圖說：「依據：〈證據〉〔n〕。想像部分：〈猜的部分〉。」欄位已由 imageFieldProblems 驗過。 */
function imaginedLine(
  image: ChapterImage,
  numbers: ReadonlyMap<string, number>,
): string {
  const basis = image.basis!;
  const marks = basis.refs.map((key) => `〔${numbers.get(key)!}〕`);
  return `依據：${basis.evidence}${marks.join("")}。想像部分：${image.imagined!}。`;
}

/** 非自製圖末行：「照片：作者，授權」，作者連原始檔案頁、授權連條款，裁切的加註。欄位已驗過。 */
function creditLine(image: ChapterImage): Element {
  const credit = image.credit!;
  const license = image.license!;
  return element("p", { className: ["chapter-figure__credit"] }, [
    text("照片："),
    link(credit.sourceUrl, credit.author),
    text("，"),
    link(license.url, license.name),
    ...(credit.cropped ? [text("（經裁切）")] : []),
  ]);
}

/**
 * 組出一張圖的 `<figure>`：圖片（左上角疊類型膠囊，實物照片沒有）加圖說。
 * `img` 是已套好 Astro 圖片屬性的 img 節點。
 */
export function buildFigure(
  image: ChapterImage,
  img: Element,
  numbers: ReadonlyMap<string, number>,
): Element {
  // 規則由內容檢查把關；走到這裡才違規代表檢查被繞過，直接中止建置。
  const problems = imageFieldProblems(image, numbers);
  if (problems.length > 0) throw new Error(problems.join(""));

  const badge = IMAGE_BADGES[image.type];
  const paragraph = (content: string) =>
    element("p", { className: ["chapter-figure__text"] }, [text(content)]);
  const caption: Element[] = isSelfMade(image.type)
    ? [paragraph(imaginedLine(image, numbers))]
    : [paragraph(image.caption!), creditLine(image)];
  return element(
    "figure",
    { className: ["chapter-figure"], "data-image-type": image.type },
    [
      element("div", { className: ["chapter-figure__media"] }, [
        img,
        // 膠囊對螢幕閱讀器是重複資訊（alt 已冠類型），所以不朗讀。
        ...(badge
          ? [
              element(
                "span",
                {
                  className: ["chapter-figure__badge"],
                  "aria-hidden": "true",
                },
                [text(badge)],
              ),
            ]
          : []),
      ]),
      element("figcaption", {}, caption),
    ],
  );
}

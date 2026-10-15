import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri";
import { chapterMediaSchema } from "../content/chapter-schema.ts";
import { referenceNumbers } from "../content/reference-numbers.ts";
import {
  imageMustBeStandalone,
  imageMustFollowParagraph,
  imageNotListed,
} from "../content-checks/image-rules.ts";
import {
  buildFigure,
  FIGURE_IMAGE_SIZES,
  type Element,
} from "./chapter-figure.ts";

type HastPluginEntry = NonNullable<
  SatteriProcessorOptions["hastPlugins"]
>[number];

/**
 * 篇章的 Markdown 外掛（只處理 `<chaptersDir>/<slug>/chapter.md`）：
 * 正文獨占一段的標準圖片 `![alt](./x.webp)`，依 frontmatter `images` 換成 `<figure>`
 * （類型膠囊與圖說），並和它所屬的前一段包進同一個 `.chapter-block`，
 * 讓版面可以把圖放到旁欄、仍緊鄰那一段。圖片沿用 Astro 原生的最佳化。
 *
 * 圖片規則由內容檢查（content-checks/images.ts）把關；這裡的 throw 只是不變式保險，
 * 訊息與判斷共用 content-checks/image-rules.ts。
 */
export function chapterMarkdown({
  chaptersDir,
}: {
  chaptersDir: string;
}): HastPluginEntry {
  const root = resolve(chaptersDir);
  return ({ fileURL, data, sourceFormat }) => {
    if (!fileURL || sourceFormat !== "markdown") return;
    const parts = relative(root, fileURLToPath(fileURL)).split(sep);
    if (parts.length !== 2 || parts[0] === ".." || parts[1] !== "chapter.md")
      return;
    const where = `篇章 ${parts[0]}：`;
    return {
      name: "chapter-markdown",
      before(tree, context) {
        type Node = (typeof tree.children)[number];
        type Parent = Extract<Node, { type: "element" }>;

        const isWhitespace = (node: Node) =>
          node.type === "text" && node.value.trim() === "";
        const isImg = (node: Node): node is Parent =>
          node.type === "element" && node.tagName === "img";
        /** 段落只含一張圖（其餘只有空白）時回傳那個 img 節點。 */
        const soleImage = (node: Node): Parent | undefined => {
          if (node.type !== "element" || node.tagName !== "p") return;
          const content = node.children.filter((c) => !isWhitespace(c));
          const only = content[0];
          return content.length === 1 && only && isImg(only) ? only : undefined;
        };
        const sourcesIn = (node: Node): string[] =>
          isImg(node)
            ? [String(node.properties.src ?? "")]
            : "children" in node
              ? node.children.flatMap(sourcesIn)
              : [];

        const media = chapterMediaSchema.safeParse(
          data.astro?.frontmatter ?? {},
        );
        if (!media.success) {
          throw new Error(
            `${where}images／references 欄位有誤：${media.error.message}`,
          );
        }
        const { images, references } = media.data;
        const numbers = referenceNumbers(references);

        // 一個段落（owner）後面可接連多張圖；非圖片的其他區塊會切斷這個關係。
        const groups: {
          owner: Node;
          figures: Element[];
          imageBlocks: Node[];
        }[] = [];
        let current: (typeof groups)[number] | undefined;
        const strays: string[] = [];
        for (const block of tree.children) {
          if (isWhitespace(block)) continue;
          const img = soleImage(block);
          if (!img) {
            strays.push(...sourcesIn(block));
            current =
              block.type === "element" && block.tagName === "p"
                ? { owner: block, figures: [], imageBlocks: [] }
                : undefined;
            if (current) groups.push(current);
            continue;
          }
          const src = String(img.properties.src ?? "").replace(/^\.\//, "");
          const image = images.find((candidate) => candidate.file === src);
          if (!image) throw new Error(`${where}${imageNotListed(src)}`);
          if (!current)
            throw new Error(`${where}${imageMustFollowParagraph(src)}`);
          current.figures.push(
            buildFigure(
              image,
              {
                type: "element",
                tagName: "img",
                properties: {
                  ...(img.properties as Element["properties"]),
                  layout: "constrained",
                  sizes: FIGURE_IMAGE_SIZES,
                  loading: "lazy",
                  decoding: "async",
                },
                children: [],
              },
              numbers,
            ),
          );
          current.imageBlocks.push(block);
        }
        // 沒有獨占一段的圖片（夾在文字、清單、引用裡）。
        const stray = strays.find((src) => src !== "");
        if (stray !== undefined) {
          throw new Error(`${where}${imageMustBeStandalone(stray)}`);
        }

        for (const { owner, figures, imageBlocks } of groups) {
          if (figures.length === 0) continue;
          context.replaceNode(owner, {
            type: "element",
            tagName: "div",
            properties: { className: ["chapter-block"] },
            children: [owner as Parent, ...figures],
          });
          for (const block of imageBlocks) context.removeNode(block);
        }
      },
    };
  };
}

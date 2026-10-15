import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { resolveChaptersDir } from "./src/content/content-dir.ts";
import { chapterMarkdown } from "./src/markdown/chapter-markdown.ts";

export default defineConfig({
  site: "https://carlwonder.gravito.dev",
  output: "static",
  trailingSlash: "always",
  // 圖片一律輸出響應式 srcset／sizes；WebP 品質 70，檔案比預設小約兩成。
  image: {
    layout: "constrained",
    service: {
      entrypoint: "astro/assets/services/sharp",
      config: { webp: { quality: 70 } },
    },
  },
  // CSS 一律內嵌：每頁樣式只有數 KB，外部檔換來的快取效益抵不過首屏多一個阻擋繪製的請求。
  build: { inlineStylesheets: "always" },
  vite: {
    build: {
      // 現代基準（Baseline）：避免轉譯已在所有現代瀏覽器原生支援的語法。
      target: "es2022",
    },
  },
  markdown: {
    processor: satteri({
      hastPlugins: [
        chapterMarkdown({
          chaptersDir: resolveChaptersDir(),
        }),
      ],
    }),
  },
});

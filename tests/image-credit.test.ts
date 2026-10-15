import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creditSegments } from "../src/content/image-credit.ts";

const license = { name: "CC BY-SA 4.0", url: "https://example.com/by-sa" };

describe("出處行", () => {
  it("作者連原始檔案頁，授權連條款", () => {
    assert.deepEqual(
      creditSegments({
        credit: { author: "甲", sourceUrl: "https://example.com/a" },
        license,
      }),
      [
        { text: "照片：" },
        { text: "甲", href: "https://example.com/a" },
        { text: "，" },
        { text: "CC BY-SA 4.0", href: "https://example.com/by-sa" },
      ],
    );
  });

  it("裁切過的加註「經裁切」", () => {
    const segments = creditSegments({
      credit: {
        author: "甲",
        sourceUrl: "https://example.com/a",
        cropped: true,
      },
      license,
    });
    assert.deepEqual(segments.at(-1), { text: "（經裁切）" });
  });

  it("自製圖沒有出處行", () => {
    assert.deepEqual(creditSegments({}), []);
  });
});

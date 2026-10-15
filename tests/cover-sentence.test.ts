import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coverSentence } from "../src/content/cover-sentence.ts";

describe("封面問句", () => {
  it("照片落在「的」後面，齒輪留在後半", () => {
    assert.deepEqual(coverSentence("安提基特拉機械：沉船裡的齒輪在算什麼？"), {
      before: "沉船裡的",
      after: "齒輪在算什麼？",
    });
  });

  it("沒有合適的「的」時，改在「是」後面切開", () => {
    assert.deepEqual(coverSentence("吉薩金字塔：巨石是誰搬上去的？"), {
      before: "巨石是",
      after: "誰搬上去的？",
    });
  });

  it("「了」可以當切點", () => {
    assert.deepEqual(coverSentence("三星堆：誰做了這些大眼面具？"), {
      before: "誰做了",
      after: "這些大眼面具？",
    });
  });

  it("沒有冒號的標題整句來切", () => {
    assert.deepEqual(coverSentence("固定資料的測試題材"), {
      before: "固定資料的",
      after: "測試題材",
    });
  });
});

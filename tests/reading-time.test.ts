import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adultReadingMinutes,
  familyTotalMinutes,
  storyReadingMinutes,
} from "../src/content/reading-time.ts";

// 以下期望值都是手算：大人 400 字／分、朗讀 327 字／分、觀察提問固定 5 分鐘，分鐘數無條件進位。
describe("大人閱讀時間", () => {
  it("剛好整除不進位", () => {
    assert.equal(adultReadingMinutes("字".repeat(800)), 2);
  });

  it("多一個字就進位", () => {
    assert.equal(adultReadingMinutes("字".repeat(801)), 3);
    assert.equal(adultReadingMinutes("字".repeat(1)), 1);
  });

  it("沿用 countText：圖片語法與標點不計字", () => {
    assert.equal(
      adultReadingMinutes(`${"字".repeat(400)}，。\n\n![圖說](./a.webp)`),
      1,
    );
  });
});

describe("故事朗讀時間", () => {
  it("327 字剛好 1 分鐘，328 字進位為 2 分鐘", () => {
    assert.equal(storyReadingMinutes("字".repeat(327)), 1);
    assert.equal(storyReadingMinutes("字".repeat(328)), 2);
  });

  it("482 字約 1.47 分鐘，進位為 2", () => {
    assert.equal(storyReadingMinutes("字".repeat(482)), 2);
  });
});

describe("親子共學合計", () => {
  it("故事朗讀＋觀察提問 5 分鐘＋活動分鐘", () => {
    // 654 字 = 2 分鐘；2 + 5 + 20 = 27
    assert.equal(familyTotalMinutes("字".repeat(654), 20), 27);
  });

  it("故事朗讀先進位再相加", () => {
    // 655 字 = 3 分鐘；3 + 5 + 20 = 28
    assert.equal(familyTotalMinutes("字".repeat(655), 20), 28);
  });
});

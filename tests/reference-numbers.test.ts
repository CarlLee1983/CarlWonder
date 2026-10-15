import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  referenceAnchor,
  referenceMark,
  referenceNumbers,
  requireReferenceNumber,
} from "../src/content/reference-numbers.ts";

describe("參考資料編號", () => {
  const numbers = referenceNumbers([{ key: "a-1" }, { key: "b" }]);

  it("錨點 id 與編號標記", () => {
    assert.equal(referenceAnchor("freeth-2021"), "ref-freeth-2021");
    assert.equal(referenceMark(3), "〔3〕");
  });

  it("取得編號", () => {
    assert.equal(requireReferenceNumber(numbers, "b", "篇章 x"), 2);
  });

  it("鍵未定義：丟出含位置與鍵的錯誤", () => {
    assert.throws(
      () => requireReferenceNumber(numbers, "nope", "篇章 x 的證據說明"),
      { message: "篇章 x 的證據說明：參考資料鍵「nope」未定義。" },
    );
  });
});

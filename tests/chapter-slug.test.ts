import assert from "node:assert/strict";
import { test } from "node:test";
import { assertChapterSlug } from "../src/content/chapter-slug.ts";

test("接受英文小寫加連字號的 slug", () => {
  for (const slug of ["sanxingdui", "giza-pyramids", "antikythera-mechanism"]) {
    assert.equal(assertChapterSlug(slug), slug);
  }
});

test("拒絕大寫、底線、空白、首尾或連續連字號與非英文的 slug", () => {
  for (const slug of [
    "Giza",
    "giza_pyramids",
    "giza pyramids",
    "-giza",
    "giza-",
    "giza--pyramids",
    "三星堆",
    "",
  ]) {
    assert.throws(() => assertChapterSlug(slug), /不合規/, slug);
  }
});

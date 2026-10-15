import assert from "node:assert/strict";
import { test } from "node:test";
import { contentLoaderBase } from "../src/content/content-dir.ts";

test("絕對路徑轉成檔案 URL", () => {
  const base = contentLoaderBase("/tmp/fixtures/chapters", "content/chapters");
  assert.ok(base instanceof URL);
  assert.equal((base as URL).href, "file:///tmp/fixtures/chapters");
});

test("相對路徑加上 ./ 前綴，相對於專案根目錄", () => {
  assert.equal(
    contentLoaderBase("tests/fixtures/chapters", "content/chapters"),
    "./tests/fixtures/chapters",
  );
});

test("未設定（空字串）時用預設目錄", () => {
  assert.equal(contentLoaderBase("", "content/chapters"), "./content/chapters");
});

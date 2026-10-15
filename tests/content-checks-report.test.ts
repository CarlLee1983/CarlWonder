import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatReport } from "../src/content-checks/report.ts";

describe("formatReport", () => {
  it("沒有問題也沒有警告：結束碼 0", () => {
    const report = formatReport([], []);
    assert.equal(report.exitCode, 0);
    assert.deepEqual(report.stderr, []);
    assert.match(report.stdout.join("\n"), /內容檢查通過/);
  });

  it("只有警告：列出警告，結束碼仍為 0", () => {
    const report = formatReport(
      [],
      [{ file: "a/chapter.md", message: "請確認" }],
    );
    assert.equal(report.exitCode, 0);
    assert.match(report.stderr.join("\n"), /警告.*1/);
    assert.match(report.stderr.join("\n"), /a\/chapter\.md.*請確認/);
  });

  it("有硬性問題：列出問題，結束碼 1", () => {
    const report = formatReport(
      [{ file: "a/chapter.md", message: "標題缺少冒號" }],
      [],
    );
    assert.equal(report.exitCode, 1);
    assert.match(report.stderr.join("\n"), /失敗.*1/);
    assert.match(report.stderr.join("\n"), /a\/chapter\.md.*標題缺少冒號/);
  });
});

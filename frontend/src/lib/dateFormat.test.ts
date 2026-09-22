import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./dateFormat";

describe("日付の表示", () => {
  it("UTC では前の日でも、東京の日付で出す", () => {
    // UTC 2026-05-29 20:00 は東京では 5/30 の朝 5 時。
    // サーバー（UTC）とブラウザ（JST）で同じ文字になるよう、東京にそろえる。
    expect(formatDate("2026-05-29T20:00:00Z", "ja-JP")).toBe("2026/5/30");
    expect(formatDate("2026-05-29T20:00:00Z", "en-US")).toBe("5/30/2026");
  });

  it("書き方を指定しても時間帯は東京のまま", () => {
    expect(formatDate("2026-05-29T20:00:00Z", "ja-JP", { year: "numeric", month: "long", day: "numeric" })).toBe(
      "2026年5月30日",
    );
    expect(formatDateTime("2026-05-29T20:00:00Z", "ja-JP", { hour: "numeric", minute: "2-digit" })).toBe("5:00");
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { dayNumberToday, visibilityLabel } from "./plans";
import type { Translations } from "./i18n";

afterEach(() => {
  vi.useRealTimers();
});

describe("dayNumberToday", () => {
  it("始めた日は1日目", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T09:00:00"));

    expect(dayNumberToday("2026-08-02T23:30:00")).toBe(1);
  });

  it("次の日は2日目（時刻ではなく日付で数える）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T01:00:00"));

    expect(dayNumberToday("2026-08-02T23:30:00")).toBe(2);
  });

  it("1週間後は8日目", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00"));

    expect(dayNumberToday("2026-08-02T12:00:00")).toBe(8);
  });
});

describe("visibilityLabel", () => {
  it("公開範囲ごとに、選んだ言語の言い方を返す", () => {
    // 辞書のどのキーを引くかを確かめたいので、見分けやすい値を入れておく。
    const t = {
      visibilityPrivate: "draft-label",
      visibilityUnlisted: "unlisted-label",
      visibilityPublic: "public-label",
    } as Translations;

    expect(visibilityLabel("private", t)).toBe("draft-label");
    expect(visibilityLabel("unlisted", t)).toBe("unlisted-label");
    expect(visibilityLabel("public", t)).toBe("public-label");
  });
});

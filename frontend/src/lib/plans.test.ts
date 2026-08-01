import { describe, it, expect, vi, afterEach } from "vitest";
import { dayNumberToday, visibilityLabel } from "./plans";

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
  it("英語のままにせず日本語で出す", () => {
    expect(visibilityLabel("private")).toBe("下書き");
    expect(visibilityLabel("unlisted")).toBe("限定公開");
    expect(visibilityLabel("public")).toBe("公開");
  });
});

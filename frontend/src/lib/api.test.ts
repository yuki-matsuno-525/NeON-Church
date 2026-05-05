import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRelativeTime } from "./api";

const NOW = new Date("2024-06-01T12:00:00Z");

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("59秒前 → たった今", () => {
    const date = new Date(NOW.getTime() - 59 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe("たった今");
  });

  it("5分前 → 5分前", () => {
    const date = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe("5分前");
  });

  it("59分前 → 59分前", () => {
    const date = new Date(NOW.getTime() - 59 * 60 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe("59分前");
  });

  it("2時間前 → 2時間前", () => {
    const date = new Date(NOW.getTime() - 2 * 3600 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe("2時間前");
  });

  it("23時間前 → 23時間前", () => {
    const date = new Date(NOW.getTime() - 23 * 3600 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe("23時間前");
  });

  it("3日前 → 3日前", () => {
    const date = new Date(NOW.getTime() - 3 * 86400 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe("3日前");
  });

  it("29日前 → 29日前", () => {
    const date = new Date(NOW.getTime() - 29 * 86400 * 1000);
    expect(formatRelativeTime(date.toISOString())).toBe("29日前");
  });

  it("30日以上前 → 日付文字列", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const result = formatRelativeTime(date.toISOString());
    // ja-JP ロケール形式: 2024/1/1 など
    expect(result).toMatch(/\d{4}/);
    expect(result).not.toContain("前");
  });
});

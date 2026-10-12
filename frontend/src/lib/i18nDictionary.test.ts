import { describe, expect, it } from "vitest";
import { translations } from "./i18nDictionary";

describe("Q&A status labels", () => {
  it("describes best-answer state as resolved rather than answer count", () => {
    expect(translations.en.filterUnanswered).toBe("Unresolved");
    expect(translations.en.filterAnswered).toBe("Resolved");
    expect(translations.ja.filterUnanswered).toBe("未解決");
    expect(translations.ja.filterAnswered).toBe("解決済み");
  });
});

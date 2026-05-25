import { describe, it, expect } from "vitest";
import { notificationTargetUrl, notificationContextLabel } from "./notificationTarget";
import { translations } from "./i18n";
import type { Notification } from "./types";

function makeN(overrides: Partial<Notification>): Notification {
  return {
    id: "n1",
    notification_type: "reply",
    actor_username: "alice",
    comment_id: "c1",
    comment_body_snippet: "snippet",
    translation_project_id: null,
    is_read: false,
    created_at: "",
    target_kind: null,
    book_name: null,
    chapter_number: null,
    verse_number: null,
    translation_unit_id: null,
    is_qa: false,
    ...overrides,
  };
}

describe("notificationTargetUrl", () => {
  it("verse_comment は /{slug}/{chapter}#verse-{verse} を返す", () => {
    const url = notificationTargetUrl(
      makeN({ target_kind: "verse_comment", book_name: "マタイによる福音書", chapter_number: 3, verse_number: 12 })
    );
    expect(url).toMatch(/\/[a-z]+\/3#verse-12$/);
  });

  it("chapter_comment は /{slug}/{chapter}#chapter-comments を返す", () => {
    const url = notificationTargetUrl(
      makeN({ target_kind: "chapter_comment", book_name: "マタイによる福音書", chapter_number: 3 })
    );
    expect(url).toMatch(/\/[a-z]+\/3#chapter-comments$/);
  });

  it("book_comment は /{slug}#book-comments を返す", () => {
    const url = notificationTargetUrl(
      makeN({ target_kind: "book_comment", book_name: "マタイによる福音書" })
    );
    expect(url).toMatch(/\/[a-z]+#book-comments$/);
  });

  it("qa は /qa を返す（詳細ページ未実装のため）", () => {
    expect(notificationTargetUrl(makeN({ target_kind: "qa" }))).toBe("/qa");
  });

  it("translation_unit は /translations/{project_id} を返す", () => {
    const url = notificationTargetUrl(
      makeN({ target_kind: "translation_unit", translation_project_id: "p1" })
    );
    expect(url).toBe("/translations/p1");
  });

  it("解決できない book_name は null", () => {
    expect(
      notificationTargetUrl(
        makeN({ target_kind: "verse_comment", book_name: "知らない本", chapter_number: 1, verse_number: 1 })
      )
    ).toBeNull();
  });

  it("target_kind=null は null", () => {
    expect(notificationTargetUrl(makeN({ target_kind: null }))).toBeNull();
  });
});

describe("notificationContextLabel", () => {
  it("verse_comment は '書名 3章12節' を返す (ja)", () => {
    const label = notificationContextLabel(
      makeN({ target_kind: "verse_comment", book_name: "マタイによる福音書", chapter_number: 3, verse_number: 12 }),
      translations.ja
    );
    expect(label).toBe("マタイによる福音書 3章12節");
  });

  it("qa は Q&A プレフィックスを付ける", () => {
    const label = notificationContextLabel(
      makeN({ target_kind: "qa", book_name: "マタイによる福音書", chapter_number: 1, verse_number: 1 }),
      translations.ja
    );
    expect(label?.startsWith("Q&A")).toBe(true);
  });

  it("情報不足の場合 null", () => {
    expect(
      notificationContextLabel(makeN({ target_kind: "verse_comment" }), translations.ja)
    ).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { notificationTargetUrl, notificationContextLabel } from "./notificationTarget";
import { translations } from "./i18n";
import type { Notification } from "./types";

function makeN(overrides: Partial<Notification>): Notification {
  return {
    id: "n1",
    notification_type: "reply",
    actor_username: "alice",
    body_snippet: "snippet",
    comment_id: "c1",
    question_id: null,
    translation_project_id: null,
    is_read: false,
    created_at: "",
    target_kind: null,
    book_name: null,
    chapter_number: null,
    verse_number: null,
    translation_unit_id: null,
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

  it("qa は /qa/{question_id} を返す", () => {
    expect(notificationTargetUrl(makeN({ target_kind: "qa", question_id: "q1" }))).toBe("/qa/q1");
  });

  it("qa で question_id が無ければ null（リンクにしない）", () => {
    expect(notificationTargetUrl(makeN({ target_kind: "qa" }))).toBeNull();
  });

  it("translation_unit は /translations/{project_id} を返す", () => {
    const url = notificationTargetUrl(
      makeN({ target_kind: "translation_unit", translation_project_id: "p1" })
    );
    expect(url).toBe("/translations/p1");
  });

  it("translation_unit includes the exact unit anchor when available", () => {
    expect(
      notificationTargetUrl(
        makeN({
          target_kind: "translation_unit",
          translation_project_id: "p1",
          translation_unit_id: "u1",
        })
      )
    ).toBe("/translations/p1#unit-u1");
  });

  it("translation project verse comments stay in the project reader", () => {
    expect(
      notificationTargetUrl(
        makeN({
          target_kind: "translation_project_comment",
          translation_project_id: "p1",
          chapter_number: 3,
          verse_number: 12,
        })
      )
    ).toBe("/translations/p1/read/3#verse-12");
  });

  it("translation project chapter and book comments use project comment anchors", () => {
    expect(
      notificationTargetUrl(
        makeN({
          target_kind: "translation_project_comment",
          translation_project_id: "p1",
          chapter_number: 3,
          verse_number: null,
        })
      )
    ).toBe("/translations/p1/read/3#chapter-comments");
    expect(
      notificationTargetUrl(
        makeN({
          target_kind: "translation_project_comment",
          translation_project_id: "p1",
          chapter_number: null,
          verse_number: null,
        })
      )
    ).toBe("/translations/p1/read#chapter-comments");
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

  it("translation project comments have an explicit translation context", () => {
    const label = notificationContextLabel(
      makeN({
        target_kind: "translation_project_comment",
        book_name: "Matthew",
        chapter_number: 3,
        verse_number: 12,
      }),
      translations.en
    );
    expect(label).toContain(translations.en.translationsTitle);
    expect(label).toContain("Matthew");
  });
});

describe("解釈書の場所へのコメントの通知", () => {
  it("その解釈書の区切りへ飛び、場所の名前を出す", () => {
    const n = makeN({
      target_kind: "commentary_comment",
      book_name: null,
      commentary_work: "uchimura-romans",
      commentary_label: "ロマ書の研究 › 第41講 › 2",
      chapter_number: 41,
      verse_number: 2,
    });
    expect(notificationTargetUrl(n)).toBe("/commentary/uchimura-romans/41?s=2#s-2");
    expect(notificationContextLabel(n, translations.ja)).toBe("ロマ書の研究 › 第41講 › 2");
  });

  it("章へのコメントなら章のページへ", () => {
    const n = makeN({ target_kind: "commentary_comment", commentary_work: "uchimura-romans", chapter_number: 0, verse_number: null });
    expect(notificationTargetUrl(n)).toBe("/commentary/uchimura-romans/0");
  });
});

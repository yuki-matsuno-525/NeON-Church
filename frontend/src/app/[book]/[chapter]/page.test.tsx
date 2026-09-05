import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ChapterPage from "./page";

// URL の ?verse= を、テストごとに差し替えられるようにしておく。
// 節を選んでいる＝コメント欄が開いている状態を作るのに使う。
const nav = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/matthew/4",
  useSearchParams: () => nav.searchParams,
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, title, children, ...props }: { href: string; title?: string; children: React.ReactNode }) => (
    <a href={href} title={title} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/serverLanguage", () => ({
  getRequestTranslation: vi.fn().mockResolvedValue("口語訳"),
}));

vi.mock("@/lib/apiServer", () => ({ serverFetch: vi.fn(), serverFetchPublic: vi.fn() }));

vi.mock("@/lib/translationPreference", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/translationPreference")>();
  return { ...actual, saveTranslationPreference: vi.fn(), readTranslationPreference: vi.fn(() => null) };
});

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchChapterBookmarks: vi.fn().mockResolvedValue([]) };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", username: "alice" } }),
}));

vi.mock("@/components/reader/VerseList", () => ({ VerseList: () => <div data-testid="verse-list" /> }));
vi.mock("@/components/reader/CommentPanel", () => ({ CommentPanel: () => <div data-testid="comment-panel" /> }));
vi.mock("@/components/reader/ChapterComments", () => ({ ChapterComments: () => <div data-testid="chapter-comments" /> }));

/** 「この書のこの章を開いた」状態を作る。書・章・節は1回でまとめて返ってくる。 */
async function mockChapterRead(
  bookId: string,
  name: string,
  number: number,
  options: { served?: string; translations?: string[]; stored?: string[]; verses?: { id: string; number: number }[] } = {},
) {
  const served = options.served ?? "口語訳";
  const apiServer = await import("@/lib/apiServer");
  vi.mocked(apiServer.serverFetch).mockResolvedValue({
    book: { id: bookId, name, translation: served, order: 1 },
    chapter: { id: `ch${number}`, book: bookId, number },
    verses: (options.verses ?? []).map((v) => ({ ...v, chapter: `ch${number}`, text: "" })),
    translations: options.translations ?? ["口語訳", "KJV"],
  });
  // 収録済みの訳の一覧。訳の切替に何を出すか・Cookie を直すかの判断に使う。
  vi.mocked(apiServer.serverFetchPublic).mockResolvedValue(
    (options.stored ?? ["口語訳", "KJV"]).map((id) => ({ id, books: 1 })),
  );
  return apiServer;
}

const renderChapter = async (slug: string, chapter: string) =>
  render(
    await ChapterPage({
      params: Promise.resolve({ book: slug, chapter }),
      searchParams: Promise.resolve({}),
    }),
  );

describe("本文ページ - 章ナビゲーション", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.searchParams = new URLSearchParams();
  });

  const prevLink = () => screen.queryByRole("link", { name: /前の章/ });
  const nextLink = () => screen.queryByRole("link", { name: /次の章/ });

  it("中間の章のとき前後両方のリンクが正しいURLで表示される", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 4);

    await renderChapter("matthew", "4");

    expect(prevLink()).toHaveAttribute("href", "/matthew/3");
    expect(nextLink()).toHaveAttribute("href", "/matthew/5");
  });

  it("1章のとき前の章リンクが表示されない", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 1);

    await renderChapter("matthew", "1");

    expect(nextLink()).toBeInTheDocument();
    expect(prevLink()).not.toBeInTheDocument();
  });

  it("最終章（マタイ28章）のとき次の章リンクが表示されない", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 28);

    await renderChapter("matthew", "28");

    expect(prevLink()).toBeInTheDocument();
    expect(nextLink()).not.toBeInTheDocument();
  });

  it("書ごとの最終章が正しく制御される（マルコ16章）", async () => {
    await mockChapterRead("book2", "マルコによる福音書", 16);

    await renderChapter("mark", "16");

    expect(prevLink()).toBeInTheDocument();
    expect(nextLink()).not.toBeInTheDocument();
  });
});

describe("本文ページ - サーバー描画", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.searchParams = new URLSearchParams();
  });

  it("見出しを開いた直後から出す（読み込み中の枠を挟まない）", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 4);

    await renderChapter("matthew", "4");

    expect(screen.getByRole("heading", { name: "マタイ 第4章" })).toBeInTheDocument();
  });

  it("覚えている訳でサーバーに問い合わせる", async () => {
    const apiServer = await mockChapterRead("book1", "マタイによる福音書", 4);
    const { getRequestTranslation } = await import("@/lib/serverLanguage");
    vi.mocked(getRequestTranslation).mockResolvedValue("文語訳");

    await renderChapter("matthew", "4");

    expect(vi.mocked(apiServer.serverFetch).mock.calls[0][0]).toContain(
      `translation=${encodeURIComponent("文語訳")}`,
    );
  });

  it("訳の切替候補は、実際に本文がある訳だけを出す", async () => {
    // books.ts は文語訳も宣言しているが、まだ本文が入っていないので候補に出さない。
    await mockChapterRead("book1", "マタイによる福音書", 4, { translations: ["口語訳", "KJV"] });

    await renderChapter("matthew", "4");

    const options = screen.getAllByRole("option").map((el) => el.textContent);
    expect(options.some((label) => label?.includes("口語訳"))).toBe(true);
    expect(options.some((label) => label?.includes("文語訳"))).toBe(false);
  });

  it("頼んだ訳がまだ収録されていないときは、代わりの訳で出して理由を伝える", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 4, {
      served: "口語訳",
      translations: ["口語訳", "KJV"],
      stored: ["口語訳", "KJV"],
    });
    const { getRequestTranslation } = await import("@/lib/serverLanguage");
    vi.mocked(getRequestTranslation).mockResolvedValue("文語訳");

    await renderChapter("matthew", "4");

    // 本文は出る（以前はここで 404 のエラー画面になっていた）
    expect(screen.getByRole("heading", { name: "マタイ 第4章" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("文語訳");
    expect(screen.getByRole("status")).toHaveTextContent("口語訳");
  });

  it("この書に無いだけの訳（エノク書の口語訳など）では、お知らせを出さない", async () => {
    // 頼んだ訳をこの書が持たないのは普通のこと。毎回お知らせを出すと邪魔になる。
    await mockChapterRead("enoch", "Enoch", 1, {
      served: "R. H. Charles (EN)",
      translations: ["R. H. Charles (EN)"],
      stored: ["口語訳", "R. H. Charles (EN)"],
    });
    const { getRequestTranslation } = await import("@/lib/serverLanguage");
    vi.mocked(getRequestTranslation).mockResolvedValue("口語訳");

    await renderChapter("enoch", "1");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("覚えている訳がどこにも無いときは、出している訳に覚え直す", async () => {
    // 直さないと、どの書を開いても代わりの訳になりお知らせが出続けてしまう。
    await mockChapterRead("book1", "マタイによる福音書", 4, {
      served: "口語訳",
      translations: ["口語訳", "KJV"],
      stored: ["口語訳", "KJV"],
    });
    const { getRequestTranslation } = await import("@/lib/serverLanguage");
    vi.mocked(getRequestTranslation).mockResolvedValue("文語訳");
    const { saveTranslationPreference } = await import("@/lib/translationPreference");

    await renderChapter("matthew", "4");

    expect(vi.mocked(saveTranslationPreference)).toHaveBeenCalledWith("口語訳");
  });

  it("この書に無いだけの訳では、覚えている訳を書き換えない", async () => {
    await mockChapterRead("enoch", "Enoch", 1, {
      served: "R. H. Charles (EN)",
      translations: ["R. H. Charles (EN)"],
      stored: ["口語訳", "R. H. Charles (EN)"],
    });
    const { getRequestTranslation } = await import("@/lib/serverLanguage");
    vi.mocked(getRequestTranslation).mockResolvedValue("口語訳");
    const { saveTranslationPreference } = await import("@/lib/translationPreference");

    await renderChapter("enoch", "1");

    expect(vi.mocked(saveTranslationPreference)).not.toHaveBeenCalled();
  });

  it("その訳にこの書が無いときは、別の訳へ切り替える導線を出す", async () => {
    const apiServer = await import("@/lib/apiServer");
    const { ApiError } = await import("@/lib/api");
    vi.mocked(apiServer.serverFetch).mockRejectedValue(new ApiError(404, "not found", "book_not_found"));
    const { getRequestTranslation } = await import("@/lib/serverLanguage");
    vi.mocked(getRequestTranslation).mockResolvedValue("文語訳");

    await renderChapter("matthew", "4");

    expect(screen.getByRole("alert")).toHaveTextContent("文語訳");
    expect(screen.getAllByRole("button", { name: /に切り替え$/ }).length).toBeGreaterThan(0);
  });
});

describe("本文ページ - 一番上へ戻るボタン", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.searchParams = new URLSearchParams();
  });

  /** 少し下までスクロールした状態にする（ボタンはここで初めて出る）。 */
  const scrollDown = async () => {
    Object.defineProperty(window, "scrollY", { value: 400, configurable: true });
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
    });
  };

  const button = () => screen.queryByRole("button", { name: "ページ上部へ" });

  it("下までスクロールすると出る", async () => {
    await mockChapterRead("book1", "マタイによる福音書", 4);

    await renderChapter("matthew", "4");
    await scrollDown();

    expect(button()).toBeInTheDocument();
  });

  it("コメント欄を開いている間は出さない（パネルの邪魔になるため）", async () => {
    nav.searchParams = new URLSearchParams("verse=v1");
    await mockChapterRead("book1", "マタイによる福音書", 4, { verses: [{ id: "v1", number: 1 }] });

    await renderChapter("matthew", "4");
    await scrollDown();

    expect(button()).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ReadPage from "./page";
import type { TranslationProject } from "@/lib/api";

const replace = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({
  serverFetchAll: vi.fn(),
  serverIsSignedIn: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchReadingProgress: vi.fn().mockResolvedValue([]) };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));

const makeProject = (overrides: Partial<TranslationProject> = {}): TranslationProject => ({
  id: "tp1",
  name: "マタイ英訳プロジェクト",
  description: "",
  owner_username: "alice",
  source_book: "b1",
  source_book_name: "マタイによる福音書",
  source_book_translation: "口語訳",
  target_language: "en",
  status: "published",
  unit_count: 100,
  done_count: 100,
  is_member: false,
  membership_status: null,
  is_in_library: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
  ...overrides,
});

async function mockServer({ signedIn = false, library = [] as TranslationProject[] } = {}) {
  const apiServer = await import("@/lib/apiServer");
  vi.mocked(apiServer.serverIsSignedIn).mockResolvedValue(signedIn);
  vi.mocked(apiServer.serverFetchAll).mockResolvedValue(library);
  return apiServer;
}

const renderPage = async () => render(await ReadPage());

describe("読むところの入口", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    currentSearch = "";
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it("未ログインのときは本棚を取りに行かない", async () => {
    const apiServer = await mockServer({ signedIn: false });

    await renderPage();

    expect(screen.queryByText("本棚")).not.toBeInTheDocument();
    expect(vi.mocked(apiServer.serverFetchAll)).not.toHaveBeenCalled();
  });

  it("本棚が0件のときはカテゴリを出さない", async () => {
    await mockServer({ signedIn: true, library: [] });
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    await renderPage();

    expect(screen.queryByText("本棚")).not.toBeInTheDocument();
  });

  it("本棚に登録があると、カテゴリを選んだときに読むページへリンクする", async () => {
    await mockServer({ signedIn: true, library: [makeProject()] });
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    await renderPage();

    // 翻訳本棚はカテゴリチップとして現れる。既定では別ジャンルが選択されているのでカードはまだ出ない。
    const chip = screen.getByRole("button", { name: /本棚/ });
    expect(screen.queryByText("マタイ英訳プロジェクト")).not.toBeInTheDocument();

    fireEvent.click(chip);

    expect(screen.getByText("マタイ英訳プロジェクト").closest("a")).toHaveAttribute(
      "href",
      "/translations/tp1/read",
    );
  });

  it("書名検索でカテゴリーをまたいだ書を表示する", async () => {
    await mockServer();

    await renderPage();

    const searchBox = screen.getByRole("searchbox", { name: "書を検索" });
    fireEvent.change(searchBox, { target: { value: "Peter" } });

    expect(screen.getByText("ペテロの福音書")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "入力をクリア" }));
    expect(searchBox).toHaveValue("");
  });

  it("URL の q で入力欄を初期化し、打ち直したら URL も書き換える", async () => {
    await mockServer();
    currentSearch = "q=Peter";

    await renderPage();

    const searchBox = screen.getByRole("searchbox");
    expect(searchBox).toHaveValue("Peter");

    fireEvent.change(searchBox, { target: { value: "John" } });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/read?q=John", { scroll: false }));
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TranslationsPage from "./page";
import type { TranslationProject } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchTranslations: vi.fn(),
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeProject = (overrides: Partial<TranslationProject> = {}): TranslationProject => ({
  id: "p1",
  name: "マタイ英訳プロジェクト",
  description: "マタイによる福音書の英訳プロジェクトです。",
  owner_username: "alice",
  source_book: "b1",
  source_book_name: "マタイによる福音書",
  target_language: "en",
  status: "active",
  unit_count: 100,
  done_count: 30,
  is_member: false,
  is_in_library: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
  ...overrides,
});

describe("TranslationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中に Skeleton が表示される", async () => {
    const { fetchTranslations } = await import("@/lib/api");
    vi.mocked(fetchTranslations).mockReturnValue(new Promise(() => {}));
    mockUseAuth.mockReturnValue({ user: null });

    render(<TranslationsPage />);
    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
  });

  it("ログイン済みユーザーに「＋ 新規作成」リンクが表示される", async () => {
    const { fetchTranslations } = await import("@/lib/api");
    vi.mocked(fetchTranslations).mockResolvedValue([makeProject()]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" } });

    render(<TranslationsPage />);

    await screen.findByText(/＋ 新規作成/);
  });

  it("未ログインでは「＋ 新規作成」が表示されない", async () => {
    const { fetchTranslations } = await import("@/lib/api");
    vi.mocked(fetchTranslations).mockResolvedValue([makeProject()]);
    mockUseAuth.mockReturnValue({ user: null });

    render(<TranslationsPage />);

    await screen.findByText("マタイ英訳プロジェクト");
    expect(screen.queryByText(/＋ 新規作成/)).not.toBeInTheDocument();
  });

  it("プロジェクト一覧が表示される（プロジェクト名・言語）", async () => {
    const { fetchTranslations } = await import("@/lib/api");
    vi.mocked(fetchTranslations).mockResolvedValue([makeProject()]);
    mockUseAuth.mockReturnValue({ user: null });

    render(<TranslationsPage />);

    await screen.findByText("マタイ英訳プロジェクト");
    expect(screen.getByText(/English/)).toBeInTheDocument();
  });

  it("プロジェクトカードに進捗バーと進捗数が表示される", async () => {
    const { fetchTranslations } = await import("@/lib/api");
    vi.mocked(fetchTranslations).mockResolvedValue([makeProject()]);
    mockUseAuth.mockReturnValue({ user: null });

    render(<TranslationsPage />);

    await screen.findByText("マタイ英訳プロジェクト");
    expect(screen.getByText("30/100 (30%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /マタイ英訳プロジェクト.*進捗/ })).toHaveAttribute("aria-valuenow", "30");
  });

  it("fetchTranslations 失敗でもクラッシュしない", async () => {
    const { fetchTranslations } = await import("@/lib/api");
    vi.mocked(fetchTranslations).mockRejectedValue(new Error("Network Error"));
    mockUseAuth.mockReturnValue({ user: null });

    render(<TranslationsPage />);

    await screen.findByText("まだ公開されたプロジェクトはありません。");
  });

  it("プロジェクトなしのとき空状態メッセージが表示される", async () => {
    const { fetchTranslations } = await import("@/lib/api");
    vi.mocked(fetchTranslations).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: null });

    render(<TranslationsPage />);

    await screen.findByText("まだ公開されたプロジェクトはありません。");
  });

  it("複数のプロジェクトがすべて表示される", async () => {
    const { fetchTranslations } = await import("@/lib/api");
    vi.mocked(fetchTranslations).mockResolvedValue([
      makeProject({ id: "p1", name: "マタイ英訳プロジェクト" }),
      makeProject({ id: "p2", name: "マルコ仏訳プロジェクト", target_language: "fr" }),
    ]);
    mockUseAuth.mockReturnValue({ user: null });

    render(<TranslationsPage />);

    await screen.findByText("マタイ英訳プロジェクト");
    expect(screen.getByText("マルコ仏訳プロジェクト")).toBeInTheDocument();
    expect(screen.getByText(/Français/)).toBeInTheDocument();
  });
});

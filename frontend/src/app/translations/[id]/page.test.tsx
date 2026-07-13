import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TranslationDetailPage from "./page";
import type { TranslationProject, TranslationUnit } from "@/lib/api";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (p: unknown) => {
      if (p instanceof Promise) return { id: "p1" };
      return actual.use(p as never);
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchTranslation: vi.fn(),
    fetchTranslationUnits: vi.fn(),
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", username: "alice" } }),
}));

const makeProject = (overrides: Partial<TranslationProject> = {}): TranslationProject => ({
  id: "p1",
  name: "マタイ英訳プロジェクト",
  description: "",
  owner_username: "alice",
  source_book: "b1",
  source_book_name: "マタイによる福音書",
  target_language: "en",
  status: "active",
  unit_count: 2,
  done_count: 0,
  is_member: false,
  is_in_library: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
  ...overrides,
});

const makeUnit = (overrides: Partial<TranslationUnit> = {}): TranslationUnit => ({
  id: "u1",
  verse: "v1",
  verse_number: 3,
  verse_text: "Blessed are the poor in spirit.",
  chapter: "ch5",
  chapter_number: 5,
  assigned_to: null,
  assigned_to_username: null,
  body: "心の貧しい人々は幸いである。",
  status: "review",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
  ...overrides,
});

describe("TranslationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("プロジェクト概要に状態・進捗・レビュー待ち件数が表示される", async () => {
    const { fetchTranslation, fetchTranslationUnits } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject({ done_count: 1, unit_count: 3 }));
    vi.mocked(fetchTranslationUnits).mockResolvedValue([
      makeUnit(),
      makeUnit({ id: "u2", verse_number: 4, status: "done" }),
      makeUnit({ id: "u3", verse_number: 5, status: "todo" }),
    ]);

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    await screen.findByText("マタイ英訳プロジェクト");
    expect(screen.getByText("状態")).toBeInTheDocument();
    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText("1/3 (33%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /進捗/ })).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByRole("button", { name: "レビュー (1)" })).toBeInTheDocument();
  });

  it("レビュー中ユニットから翻訳読書ページの該当節へ移動できる", async () => {
    const { fetchTranslation, fetchTranslationUnits } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject());
    vi.mocked(fetchTranslationUnits).mockResolvedValue([
      makeUnit(),
      makeUnit({ id: "u2", verse_number: 4, status: "done" }),
    ]);

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    await screen.findByText("マタイ英訳プロジェクト");
    fireEvent.click(screen.getByRole("button", { name: "レビュー (1)" }));

    const targetLink = screen.getByRole("link", { name: "該当箇所へ" });
    expect(targetLink).toHaveAttribute("href", "/translations/p1/read/5#verse-3");
  });
});

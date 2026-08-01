import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import TranslationDetailPage from "./page";
import type { TranslationProject, TranslationUnit, TranslationUnitSummary } from "@/lib/api";

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
    fetchTranslationUnitSummary: vi.fn(),
    updateTranslationUnit: vi.fn(),
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

/** 章一覧と状態ごとの件数。画面はこれで章ボタンとレビュー件数を出す。 */
const makeSummary = (overrides: Partial<TranslationUnitSummary> = {}): TranslationUnitSummary => ({
  chapters: [5],
  status_counts: { todo: 0, in_progress: 0, review: 1, done: 0 },
  total: 1,
  ...overrides,
});

describe("TranslationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("プロジェクト概要に状態・進捗・レビュー待ち件数が表示される", async () => {
    const { fetchTranslation, fetchTranslationUnits, fetchTranslationUnitSummary } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject({ done_count: 1, unit_count: 3 }));
    // レビュー件数は表示中の章ではなく企画全体の数（summary）から出す
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(
      makeSummary({ status_counts: { todo: 1, in_progress: 0, review: 1, done: 1 }, total: 3 })
    );
    vi.mocked(fetchTranslationUnits).mockResolvedValue([makeUnit()]);

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    await screen.findByText("マタイ英訳プロジェクト");
    expect(screen.getByText("状態")).toBeInTheDocument();
    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText("1/3 (33%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /進捗/ })).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByRole("button", { name: "レビュー (1)" })).toBeInTheDocument();
  });

  it("レビュー中ユニットの「該当ユニットへ」でユニット一覧の該当カードへ移動する", async () => {
    const { fetchTranslation, fetchTranslationUnits, fetchTranslationUnitSummary } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject());
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(makeSummary());
    vi.mocked(fetchTranslationUnits).mockResolvedValue([makeUnit()]);

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    await screen.findByText("マタイ英訳プロジェクト");
    fireEvent.click(await screen.findByRole("button", { name: "レビュー (1)" }));

    fireEvent.click(await screen.findByRole("button", { name: "該当ユニットへ" }));

    // ユニットタブに切り替わり、その章のユニットを取り直して該当カードが表示される
    expect(screen.getByRole("button", { name: "ユニット" })).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(document.getElementById("unit-u1")).toBeInTheDocument());
    expect(fetchTranslationUnits).toHaveBeenCalledWith("p1", { chapter: 5 });
  });

  it("レビュー承認は確認モーダルを挟む", async () => {
    const { fetchTranslation, fetchTranslationUnits, fetchTranslationUnitSummary, updateTranslationUnit } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject());
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(makeSummary());
    vi.mocked(fetchTranslationUnits).mockResolvedValue([makeUnit()]);
    vi.mocked(updateTranslationUnit).mockResolvedValue(makeUnit({ status: "done" }));

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    await screen.findByText("マタイ英訳プロジェクト");
    fireEvent.click(await screen.findByRole("button", { name: "レビュー (1)" }));

    fireEvent.click(await screen.findByRole("button", { name: "承認" }));
    // モーダルが出るまで API は呼ばれない
    expect(updateTranslationUnit).not.toHaveBeenCalled();
    expect(screen.getByText("この訳を承認しますか？")).toBeInTheDocument();

    // モーダル内の確認ボタンで承認が実行される
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "承認" }));
    expect(updateTranslationUnit).toHaveBeenCalledWith("p1", "u1", { status: "done" });
  });
});

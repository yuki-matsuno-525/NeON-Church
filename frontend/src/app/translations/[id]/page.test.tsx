import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import TranslationDetailPage from "./page";
import type { Chapter, TranslationProject, TranslationUnit, TranslationUnitSummary, Verse } from "@/lib/api";
import { translationUiText } from "../translationUiText";

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
    addTranslationUnit: vi.fn(),
    fetchChapters: vi.fn(),
    fetchVerses: vi.fn(),
    activateTranslation: vi.fn(),
    fetchTranslationLanguages: vi.fn().mockResolvedValue([]),
    fetchTranslationMembers: vi.fn().mockResolvedValue([]),
    fetchBookmarks: vi.fn().mockResolvedValue([]),
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeProject = (overrides: Partial<TranslationProject> = {}): TranslationProject => ({
  id: "p1",
  name: "マタイ英訳プロジェクト",
  description: "",
  owner_username: "alice",
  source_book: "b1",
  source_book_name: "マタイによる福音書",
  source_book_translation: "口語訳",
  target_language: "en",
  status: "active",
  unit_count: 2,
  done_count: 0,
  is_member: false,
  membership_status: null,
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
  chapter_summaries: [
    { number: 5, total: 1, status_counts: { todo: 0, in_progress: 0, review: 1, done: 0 } },
  ],
  assigned_to_me: 0,
  total: 1,
  ...overrides,
});

describe("TranslationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" } });
  });

  it("does not treat unresolved auth and project state as project ownership", async () => {
    const {
      fetchTranslation,
      fetchTranslationMembers,
      fetchTranslationUnitSummary,
    } = await import("@/lib/api");
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject({ status: "published" }));
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(makeSummary());

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    await screen.findByRole("heading", { level: 1 });
    expect(fetchTranslationMembers).not.toHaveBeenCalled();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
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

    await screen.findByRole("heading", { name: "マタイ英訳プロジェクト" });
    expect(screen.getByText("状態")).toBeInTheDocument();
    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText("1/3 (33%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /進捗/ })).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByRole("tab", { name: "レビュー (1)" })).toBeInTheDocument();
  });

  it("レビュー中ユニットの「該当ユニットへ」でユニット一覧の該当カードへ移動する", async () => {
    const { fetchTranslation, fetchTranslationUnits, fetchTranslationUnitSummary } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject());
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(makeSummary());
    vi.mocked(fetchTranslationUnits).mockResolvedValue([makeUnit()]);

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    await screen.findByRole("heading", { name: "マタイ英訳プロジェクト" });
    fireEvent.click(await screen.findByRole("tab", { name: "レビュー (1)" }));

    fireEvent.click(await screen.findByRole("button", { name: "該当ユニットへ" }));

    // ユニットタブに切り替わり、その章のユニットを取り直して該当カードが表示される
    expect(screen.getByRole("tab", { name: "ユニット" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(document.getElementById("unit-u1")).toBeInTheDocument());
    expect(fetchTranslationUnits).toHaveBeenCalledWith("p1", {
      chapter: 5,
      status: undefined,
      assigned_to: undefined,
    });
  });

  it("レビュー承認は確認モーダルを挟む", async () => {
    const { fetchTranslation, fetchTranslationUnits, fetchTranslationUnitSummary, updateTranslationUnit } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject());
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(makeSummary());
    vi.mocked(fetchTranslationUnits).mockResolvedValue([makeUnit()]);
    vi.mocked(updateTranslationUnit).mockResolvedValue(makeUnit({ status: "done" }));

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    await screen.findByRole("heading", { name: "マタイ英訳プロジェクト" });
    fireEvent.click(await screen.findByRole("tab", { name: "レビュー (1)" }));

    fireEvent.click(await screen.findByRole("button", { name: "承認" }));
    // モーダルが出るまで API は呼ばれない
    expect(updateTranslationUnit).not.toHaveBeenCalled();
    expect(screen.getByText("この訳を承認しますか？")).toBeInTheDocument();

    // モーダル内の確認ボタンで承認が実行される
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "承認" }));
    expect(updateTranslationUnit).toHaveBeenCalledWith("p1", "u1", { status: "done" });
  });

  it("公開状態を変える前に影響を説明して確認する", async () => {
    const { fetchTranslation, fetchTranslationUnitSummary, activateTranslation } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject({ status: "draft" }));
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(
      makeSummary({ chapters: [], chapter_summaries: [], total: 0 }),
    );
    vi.mocked(activateTranslation).mockResolvedValue(makeProject({ status: "active" }));

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    fireEvent.click(await screen.findByRole("button", { name: "募集開始" }));
    expect(activateTranslation).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/参加申請できるようになります/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "募集開始" }));
    await waitFor(() => expect(activateTranslation).toHaveBeenCalledWith("p1"));
  });

  it("pending申請者を承認済みメンバーとして扱わない", async () => {
    const { fetchTranslation, fetchTranslationUnitSummary } = await import("@/lib/api");
    mockUseAuth.mockReturnValue({ user: { id: "u2", username: "bob" } });
    vi.mocked(fetchTranslation).mockResolvedValue(
      makeProject({ owner_username: "alice", membership_status: "pending" }),
    );
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(makeSummary());

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    expect(await screen.findByText(/参加申請を確認中です/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "メンバー" }));
    expect(screen.getByText(/メンバーのみ閲覧できます/)).toBeInTheDocument();
  });

  it("未保存の訳文を破棄する確認ではキャンセルに初期フォーカスし、元の操作へ戻す", async () => {
    const { fetchTranslation, fetchTranslationUnits, fetchTranslationUnitSummary } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject());
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(makeSummary());
    vi.mocked(fetchTranslationUnits).mockResolvedValue([makeUnit()]);
    const ui = translationUiText("ja");

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    await screen.findByRole("heading", { name: "マタイ英訳プロジェクト" });
    fireEvent.click(screen.getByRole("button", { name: /^第5章/ }));
    await waitFor(() => expect(document.getElementById("translation-body-u1")).toBeInTheDocument());
    const textarea = document.getElementById("translation-body-u1") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "edited draft" } });

    const reviewTab = screen.getByRole("tab", { name: /レビュー/ });
    reviewTab.focus();
    fireEvent.click(reviewTab);
    const dialog = screen.getByRole("alertdialog", { name: ui.unsavedWarning });
    const [cancelButton] = within(dialog).getAllByRole("button");
    await waitFor(() => expect(cancelButton).toHaveFocus());

    fireEvent.click(cancelButton);
    expect(screen.getByRole("tab", { name: "ユニット" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(reviewTab).toHaveFocus());

    fireEvent.click(reviewTab);
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: ui.discardAndContinue }));
    expect(reviewTab).toHaveAttribute("aria-selected", "true");
  });

  it("章の一括追加は確認ダイアログを挟み、確認後だけ全節を追加する", async () => {
    const {
      fetchTranslation,
      fetchTranslationUnits,
      fetchTranslationUnitSummary,
      fetchChapters,
      fetchVerses,
      addTranslationUnit,
    } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(makeProject());
    vi.mocked(fetchTranslationUnitSummary).mockResolvedValue(makeSummary({ chapters: [], chapter_summaries: [], total: 0 }));
    vi.mocked(fetchTranslationUnits).mockResolvedValue([]);
    vi.mocked(fetchChapters).mockResolvedValue([{ id: "c1", book: "b1", number: 1 } satisfies Chapter]);
    const verses: Verse[] = [
      { id: "v1", chapter: "c1", number: 1, text: "one" },
      { id: "v2", chapter: "c1", number: 2, text: "two" },
    ];
    vi.mocked(fetchVerses).mockResolvedValue(verses);
    vi.mocked(addTranslationUnit).mockImplementation(async (_projectId, verseId) => makeUnit({ id: `u-${verseId}`, verse: verseId }));
    const ui = translationUiText("ja");

    render(<TranslationDetailPage params={Promise.resolve({ id: "p1" })} />);

    fireEvent.click(await screen.findByRole("button", { name: "＋ ユニット追加" }));
    fireEvent.change(await screen.findByLabelText(ui.selectChapterLabel), { target: { value: "c1" } });
    await screen.findByRole("option", { name: "全節を追加" });
    const submitButton = screen.getByRole("button", { name: "追加" });
    submitButton.focus();
    fireEvent.click(submitButton);

    const dialog = await screen.findByRole("alertdialog", { name: ui.addChapterConfirm(2) });
    expect(addTranslationUnit).not.toHaveBeenCalled();
    const [cancelButton] = within(dialog).getAllByRole("button");
    await waitFor(() => expect(cancelButton).toHaveFocus());
    fireEvent.click(cancelButton);
    await waitFor(() => expect(submitButton).toHaveFocus());
    expect(addTranslationUnit).not.toHaveBeenCalled();

    fireEvent.click(submitButton);
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: ui.addChapterAction }));
    await waitFor(() => expect(addTranslationUnit).toHaveBeenCalledTimes(2));
    expect(addTranslationUnit).toHaveBeenNthCalledWith(1, "p1", "v1");
    expect(addTranslationUnit).toHaveBeenNthCalledWith(2, "p1", "v2");
  });
});

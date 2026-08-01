import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TranslationReadChapterPage from "./page";
import type { TranslationProject, TranslationUnit } from "@/lib/api";
import { translationUiText } from "../../../translationUiText";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (value: unknown) => value instanceof Promise ? { id: "p1", chapter: "1" } : actual.use(value as never),
  };
});

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchTranslation: vi.fn(), fetchTranslationRead: vi.fn() };
});

vi.mock("@/lib/versions", () => ({
  findSlugByBookName: vi.fn(() => null),
  resolveVersionChapterIds: vi.fn().mockResolvedValue([]),
  resolveVersionVerseIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/reader/CommentPanel", () => ({
  CommentPanel: () => <div>コメントパネル</div>,
}));

vi.mock("@/components/reader/ChapterComments", () => ({
  ChapterComments: () => <div>章コメント</div>,
}));

const project: TranslationProject = {
  id: "p1",
  name: "マタイ英訳",
  description: "",
  owner_username: "alice",
  source_book: "b1",
  source_book_name: "マタイによる福音書",
  target_language: "en",
  status: "published",
  unit_count: 1,
  done_count: 1,
  is_member: false,
  membership_status: null,
  is_in_library: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const unit: TranslationUnit = {
  id: "u1",
  verse: "v1",
  verse_number: 1,
  verse_text: "Source text",
  chapter: "c1",
  chapter_number: 1,
  assigned_to: null,
  assigned_to_username: null,
  body: "公開された訳文",
  status: "done",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("TranslationReadChapterPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { fetchTranslation, fetchTranslationRead } = await import("@/lib/api");
    const { findSlugByBookName, resolveVersionChapterIds, resolveVersionVerseIds } = await import("@/lib/versions");
    vi.mocked(fetchTranslation).mockResolvedValue(project);
    vi.mocked(fetchTranslationRead).mockResolvedValue({ chapters: [1], units: [unit] });
    vi.mocked(findSlugByBookName).mockReturnValue(null);
    vi.mocked(resolveVersionChapterIds).mockResolvedValue([]);
    vi.mocked(resolveVersionVerseIds).mockResolvedValue([]);
  });

  it("原文は既定で隠し、比較操作で表示する", async () => {
    render(<TranslationReadChapterPage params={Promise.resolve({ id: "p1", chapter: "1" })} />);

    await screen.findByText("公開された訳文");
    expect(screen.queryByText(/Source text/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "原文を表示" }));
    expect(screen.getByText(/Source text/)).toBeInTheDocument();
  });

  it("節にコメント操作の状態と対象パネルを関連付ける", async () => {
    render(<TranslationReadChapterPage params={Promise.resolve({ id: "p1", chapter: "1" })} />);

    const verse = await screen.findByRole("button", { name: /1:1 コメントを開く/ });
    expect(verse).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(verse);
    expect(verse).toHaveAttribute("aria-expanded", "true");
    expect(verse).toHaveAttribute("aria-controls", "translation-comment-panel");
    expect(screen.getByText("コメントパネル")).toBeInTheDocument();
  });

  it("章の関連翻訳ID解決失敗を警告し、その場で再試行できる", async () => {
    const { findSlugByBookName, resolveVersionChapterIds } = await import("@/lib/versions");
    vi.mocked(findSlugByBookName).mockReturnValue("matthew");
    vi.mocked(resolveVersionChapterIds)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(["chapter-v1"]);
    const ui = translationUiText("ja");

    render(<TranslationReadChapterPage params={Promise.resolve({ id: "p1", chapter: "1" })} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ui.relatedCommentsLoadError);
    fireEvent.click(screen.getByRole("button", { name: ui.retryRelatedComments }));

    await waitFor(() => expect(resolveVersionChapterIds).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(ui.relatedCommentsLoadError)).not.toBeInTheDocument());
  });

  it("節の関連翻訳ID解決失敗を警告し、その場で再試行できる", async () => {
    const { findSlugByBookName, resolveVersionVerseIds } = await import("@/lib/versions");
    vi.mocked(findSlugByBookName).mockReturnValue("matthew");
    vi.mocked(resolveVersionVerseIds)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(["verse-v1"]);
    const ui = translationUiText("ja");

    render(<TranslationReadChapterPage params={Promise.resolve({ id: "p1", chapter: "1" })} />);

    fireEvent.click(await screen.findByRole("button", { name: /1:1 コメントを開く/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ui.relatedCommentsLoadError);
    fireEvent.click(screen.getByRole("button", { name: ui.retryRelatedComments }));

    await waitFor(() => expect(resolveVersionVerseIds).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(ui.relatedCommentsLoadError)).not.toBeInTheDocument());
  });
});

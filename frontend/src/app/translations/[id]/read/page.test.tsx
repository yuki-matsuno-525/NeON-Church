import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TranslationReadPage from "./page";
import type { TranslationProject } from "@/lib/api";
import { translationUiText } from "../../translationUiText";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (value: unknown) => value instanceof Promise ? { id: "p1" } : actual.use(value as never),
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
  findSlugByBookName: vi.fn(() => "matthew"),
  resolveVersionBookIds: vi.fn(),
}));

vi.mock("@/components/reader/ChapterComments", () => ({
  ChapterComments: ({ allVersionIds }: { allVersionIds: string[] }) => (
    <div data-testid="chapter-comments-version-ids">{allVersionIds.join(",")}</div>
  ),
}));

const project: TranslationProject = {
  id: "p1",
  name: "マタイ英訳",
  description: "",
  owner_username: "alice",
  source_book: "b1",
  source_book_name: "マタイによる福音書",
  source_book_translation: "口語訳",
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

describe("TranslationReadPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { fetchTranslation, fetchTranslationRead } = await import("@/lib/api");
    vi.mocked(fetchTranslation).mockResolvedValue(project);
    vi.mocked(fetchTranslationRead).mockResolvedValue({ chapters: [1], units: [] });
  });

  it("関連翻訳IDの解決失敗を警告し、その場で再試行できる", async () => {
    const { resolveVersionBookIds } = await import("@/lib/versions");
    vi.mocked(resolveVersionBookIds)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(["book-v1", "book-v2"]);
    const ui = translationUiText("ja");

    render(<TranslationReadPage params={Promise.resolve({ id: "p1" })} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ui.relatedCommentsLoadError);
    expect(screen.getByTestId("chapter-comments-version-ids")).toHaveTextContent("");

    fireEvent.click(screen.getByRole("button", { name: ui.retryRelatedComments }));

    await waitFor(() => expect(resolveVersionBookIds).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(ui.relatedCommentsLoadError)).not.toBeInTheDocument());
    expect(screen.getByTestId("chapter-comments-version-ids")).toHaveTextContent("book-v1,book-v2");
  });
});

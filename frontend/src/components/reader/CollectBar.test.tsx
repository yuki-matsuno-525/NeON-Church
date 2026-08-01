import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CollectBar } from "./CollectBar";
import { addVersesToCompilation, fetchMyCompiledBooks, type CompiledBook } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchMyCompiledBooks: vi.fn(),
    addVersesToCompilation: vi.fn(),
  };
});

const makeBook = (overrides: Partial<CompiledBook> = {}): CompiledBook => ({
  id: "book1",
  title: "光と闇の書",
  slug: "book1",
  description: "",
  annotation: "",
  tray_name: "拾った断片",
  owner_username: "editor",
  visibility: "private",
  motif_tags: [],
  chapter_count: 0,
  verse_count: 0,
  chapters: [],
  tray: [],
  created_at: "2026-07-17T00:00:00Z",
  updated_at: "2026-07-17T00:00:00Z",
  ...overrides,
});

describe("CollectBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchMyCompiledBooks).mockResolvedValue([makeBook()]);
  });

  it("選んだ数と、追加先の断章ボックスの名前を出す", async () => {
    render(<CollectBar verseIds={["v1", "v2"]} onDone={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByTestId("collect-count")).toHaveTextContent("2節を選択中");
    expect(screen.getByTestId("collect-submit")).toHaveTextContent("拾った断片へ入れる");
  });

  it("選んだ順のまま、まとめて入れる", async () => {
    vi.mocked(addVersesToCompilation).mockResolvedValue(makeBook());
    const onDone = vi.fn();
    render(<CollectBar verseIds={["v2", "v1"]} onDone={onDone} onCancel={vi.fn()} />);
    await screen.findByTestId("collect-count");

    fireEvent.click(screen.getByTestId("collect-submit"));

    await waitFor(() => expect(addVersesToCompilation).toHaveBeenCalledWith("book1", ["v2", "v1"]));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(await screen.findByText("拾った断片へ2節入れました。")).toBeInTheDocument();
  });

  it("1つも選んでいなければ入れられない", async () => {
    render(<CollectBar verseIds={[]} onDone={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByTestId("collect-count");

    expect(screen.getByTestId("collect-submit")).toBeDisabled();
  });

  it("編纂書がまだ無いときは作成へ案内する", async () => {
    vi.mocked(fetchMyCompiledBooks).mockResolvedValue([]);
    render(<CollectBar verseIds={["v1"]} onDone={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByText("新しく作成")).toHaveAttribute("href", "/compilations/new");
    expect(screen.queryByTestId("collect-submit")).not.toBeInTheDocument();
  });

  it("追加に失敗しても画面が壊れない", async () => {
    vi.mocked(addVersesToCompilation).mockRejectedValue(new Error("boom"));
    render(<CollectBar verseIds={["v1"]} onDone={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByTestId("collect-count");

    fireEvent.click(screen.getByTestId("collect-submit"));

    expect(await screen.findByText("追加できませんでした。")).toBeInTheDocument();
  });
});

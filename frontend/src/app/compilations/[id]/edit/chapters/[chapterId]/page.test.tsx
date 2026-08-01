import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import CompilationChapterEditPage from "./page";
import {
  createCompiledVerse,
  deleteCompiledChapter,
  deleteCompiledVerse,
  fetchCompiledBook,
  reorderCompiledVerses,
  type CompiledBook,
  type CompiledVerse,
} from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchCompiledBook: vi.fn(),
    reorderCompiledVerses: vi.fn(),
    createCompiledVerse: vi.fn(),
    updateCompiledChapter: vi.fn(),
    updateCompiledVerse: vi.fn(),
    deleteCompiledVerse: vi.fn(),
    deleteCompiledChapter: vi.fn(),
  };
});

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "book1", chapterId: "chap1" }),
  useRouter: () => ({ push: mockPush }),
}));

// 同じ参照を返し続ける。毎回新しいオブジェクトを返すと、画面の読み込みが繰り返し走ってしまう。
vi.mock("@/contexts/AuthContext", () => {
  const value = { user: { id: "u1", username: "editor" }, loading: false };
  return { useAuth: () => value };
});

const mockIsMobile = vi.fn(() => false);
vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: () => mockIsMobile(),
}));

const makeVerse = (id: string, body: string, chapter: string | null, verseNumber: number | null): CompiledVerse => ({
  id,
  book: "book1",
  chapter,
  verse_number: verseNumber,
  order: 1,
  source_kind: "note",
  source_verse: null,
  source_translation_unit: null,
  source_compiled_verse: null,
  body_snapshot: body,
  source_label: "Original note",
  source_reference: { kind: "note" },
  curator_note: "",
  motif_tags: [],
  created_at: "2026-07-17T00:00:00Z",
  updated_at: "2026-07-17T00:00:00Z",
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
  chapter_count: 1,
  verse_count: 2,
  chapters: [
    {
      id: "chap1",
      book: "book1",
      number: 1,
      title: "光をわけた日",
      introduction: "",
      annotation: "",
      order: 1,
      motif_tags: [],
      verse_count: 1,
      verses: [makeVerse("v-in-chapter", "章にある断章", "chap1", 1)],
      created_at: "2026-07-17T00:00:00Z",
      updated_at: "2026-07-17T00:00:00Z",
    },
  ],
  tray: [makeVerse("v-in-tray", "ボックスにある断章", null, null)],
  created_at: "2026-07-17T00:00:00Z",
  updated_at: "2026-07-17T00:00:00Z",
  ...overrides,
});

/** ドラッグは dataTransfer を自前で用意しないと jsdom 上で再現できない。 */
function makeDataTransfer() {
  const store: Record<string, string> = {};
  return {
    types: [] as string[],
    setData(type: string, value: string) {
      store[type] = value;
      this.types.push(type);
    },
    getData(type: string) {
      return store[type] ?? "";
    },
    setDragImage() {},
    effectAllowed: "move",
  };
}

describe("編纂の作業ページ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile.mockReturnValue(false);
    vi.mocked(fetchCompiledBook).mockResolvedValue(makeBook());
    vi.mocked(reorderCompiledVerses).mockResolvedValue(makeBook());
  });

  it("左に章、右に断章ボックスを名前付きで出す", async () => {
    render(<CompilationChapterEditPage />);

    expect(await screen.findByText("第1章")).toBeInTheDocument();
    expect(screen.getByDisplayValue("光をわけた日")).toBeInTheDocument();
    expect(screen.getByText("拾った断片")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ボックスにある断章")).toBeInTheDocument();
    expect(screen.getByDisplayValue("章にある断章")).toBeInTheDocument();
  });

  it("断章ボックスから章へドラッグすると、その章の並びで保存する", async () => {
    render(<CompilationChapterEditPage />);
    await screen.findByText("第1章");

    const trayList = screen.getByTestId("verse-drop-list-tray");
    const card = within(trayList).getByTestId("verse-card");
    const chapterList = screen.getByTestId("verse-drop-list-chap1");
    const dataTransfer = makeDataTransfer();

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(chapterList, { dataTransfer });
    fireEvent.drop(chapterList, { dataTransfer });

    await waitFor(() =>
      expect(reorderCompiledVerses).toHaveBeenCalledWith("book1", "chap1", ["v-in-chapter", "v-in-tray"]),
    );
  });

  it("カードのボタンや入力欄を触ってもドラッグは始まらない", async () => {
    render(<CompilationChapterEditPage />);
    await screen.findByText("第1章");

    const trayList = screen.getByTestId("verse-drop-list-tray");
    const textarea = within(trayList).getByTestId("verse-body-input");
    const dataTransfer = makeDataTransfer();

    // 入力欄から始まったドラッグはカードまで伝わるが、そこで打ち切られる。
    fireEvent.dragStart(textarea, { dataTransfer });

    expect(dataTransfer.types).not.toContain("application/x-neon-compiled-verse");
  });

  it("PCではドラッグで動かすので、移動のボタンは出さない", async () => {
    render(<CompilationChapterEditPage />);
    await screen.findByText("第1章");

    expect(screen.queryByTestId("send-verse-to-chapter")).not.toBeInTheDocument();
    expect(screen.queryByTestId("send-verse-to-tray")).not.toBeInTheDocument();
    expect(screen.queryByTestId("move-verse-up")).not.toBeInTheDocument();
    // 捨てるのはドラッグではできないので、PCでも出す。
    expect(screen.getByTestId("delete-verse")).toBeInTheDocument();
  });

  it("スマホではドラッグを使わず、ボタンで章へ入れる", async () => {
    mockIsMobile.mockReturnValue(true);
    render(<CompilationChapterEditPage />);
    await screen.findByText("第1章");

    expect(screen.queryAllByTestId("verse-card")[0]).not.toHaveAttribute("draggable", "true");
    fireEvent.click(screen.getByTestId("send-verse-to-chapter"));

    await waitFor(() =>
      expect(reorderCompiledVerses).toHaveBeenCalledWith("book1", "chap1", ["v-in-chapter", "v-in-tray"]),
    );
  });

  it("スマホでは章の断章を消さずに断章ボックスへ戻せる", async () => {
    mockIsMobile.mockReturnValue(true);
    render(<CompilationChapterEditPage />);
    await screen.findByText("第1章");

    const sendBack = screen.getByTestId("send-verse-to-tray");
    expect(sendBack).toHaveTextContent("拾った断片に戻す");
    fireEvent.click(sendBack);

    await waitFor(() =>
      expect(reorderCompiledVerses).toHaveBeenCalledWith("book1", null, ["v-in-chapter", "v-in-tray"]),
    );
  });

  it("断章を捨てるときはモーダルで確認する", async () => {
    vi.mocked(deleteCompiledVerse).mockResolvedValue(undefined);
    render(<CompilationChapterEditPage />);
    await screen.findByText("第1章");

    fireEvent.click(screen.getByTestId("delete-verse"));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("この断章を捨てますか？");
    fireEvent.click(within(dialog).getByRole("button", { name: "捨てる" }));

    await waitFor(() => expect(deleteCompiledVerse).toHaveBeenCalledWith("book1", "v-in-tray"));
  });

  it("普通の本文を追加すると断章ボックスへ入る", async () => {
    vi.mocked(createCompiledVerse).mockResolvedValue(makeVerse("v-new", "新しい本文", null, null));
    render(<CompilationChapterEditPage />);
    await screen.findByText("第1章");

    fireEvent.click(screen.getByTestId("open-add-text"));
    fireEvent.change(screen.getByTestId("add-text-body"), { target: { value: "新しい本文" } });
    fireEvent.click(screen.getByTestId("add-text-button"));

    await waitFor(() =>
      expect(createCompiledVerse).toHaveBeenCalledWith("book1", { source_kind: "note", body_snapshot: "新しい本文" }),
    );
  });

  it("章を消すと、中の節の行き先を伝えてから設定ページへ戻る", async () => {
    vi.mocked(deleteCompiledChapter).mockResolvedValue(undefined);
    render(<CompilationChapterEditPage />);
    await screen.findByText("第1章");

    fireEvent.click(screen.getByTestId("delete-chapter"));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("中の1節は捨てず、拾った断片に戻ります。");
    fireEvent.click(screen.getByRole("button", { name: "章を消す" }));

    await waitFor(() => expect(deleteCompiledChapter).toHaveBeenCalledWith("book1", "chap1"));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/compilations/book1/edit"));
  });

  it("読み込みに失敗しても画面が壊れない", async () => {
    vi.mocked(fetchCompiledBook).mockRejectedValue(new Error("boom"));
    render(<CompilationChapterEditPage />);

    expect(await screen.findByText("編纂書を読み込めませんでした。")).toBeInTheDocument();
  });
});

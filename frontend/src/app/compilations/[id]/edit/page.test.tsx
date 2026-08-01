import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CompilationEditPage from "./page";
import {
  createCompiledChapter,
  deleteCompiledBook,
  fetchCompiledBook,
  reorderCompiledChapters,
  updateCompiledBook,
  type CompiledBook,
} from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchCompiledBook: vi.fn(),
    updateCompiledBook: vi.fn(),
    createCompiledChapter: vi.fn(),
    deleteCompiledBook: vi.fn(),
    reorderCompiledChapters: vi.fn(),
  };
});

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "book1" }),
  useRouter: () => ({ push: mockPush }),
}));

// 同じ参照を返し続ける。毎回新しいオブジェクトを返すと、画面の読み込みが繰り返し走ってしまう。
vi.mock("@/contexts/AuthContext", () => {
  const value = { user: { id: "u1", username: "editor" }, loading: false };
  return { useAuth: () => value };
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

const makeBook = (overrides: Partial<CompiledBook> = {}): CompiledBook => ({
  id: "book1",
  title: "光と闇の書",
  slug: "book1",
  description: "",
  annotation: "",
  tray_name: "",
  owner_username: "editor",
  visibility: "private",
  motif_tags: [],
  chapter_count: 1,
  verse_count: 0,
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
      verse_count: 0,
      verses: [],
      created_at: "2026-07-17T00:00:00Z",
      updated_at: "2026-07-17T00:00:00Z",
    },
  ],
  tray: [],
  created_at: "2026-07-17T00:00:00Z",
  updated_at: "2026-07-17T00:00:00Z",
  ...overrides,
});

describe("編纂書の設定ページ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCompiledBook).mockResolvedValue(makeBook());
  });

  it("書の設定と、読む画面と同じ章のパネルを出す", async () => {
    render(<CompilationEditPage />);

    expect(await screen.findByDisplayValue("光と闇の書")).toBeInTheDocument();
    expect(screen.getByText("章を選択")).toBeInTheDocument();
    const panel = screen.getByTestId("chapter-panel");
    expect(panel).toHaveTextContent("1");
    expect(panel).toHaveAttribute("href", "/compilations/book1/edit/chapters/chap1");
    // 公開の操作は公開範囲の選択ひとつに統一した。
    expect(screen.getByTestId("visibility-select")).toHaveValue("private");
    expect(screen.queryByText("公開する")).not.toBeInTheDocument();
  });

  it("章がまだ無いときはパネルが＋だけになる", async () => {
    vi.mocked(fetchCompiledBook).mockResolvedValue(makeBook({ chapters: [] }));
    render(<CompilationEditPage />);

    await screen.findByText("章を選択");
    expect(screen.queryByTestId("chapter-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("add-chapter-button")).toBeInTheDocument();
  });

  it("章がまだ無いときは、断章ボックスの名前で次の一歩を案内する", async () => {
    vi.mocked(fetchCompiledBook).mockResolvedValue(makeBook({ chapters: [], tray_name: "拾った断片" }));
    render(<CompilationEditPage />);

    expect(await screen.findByText("＋で章を作ると、拾った断片の断章をその章へ並べられます。")).toBeInTheDocument();
  });

  it("書の設定は保存ボタンなしで自動保存される", async () => {
    vi.mocked(updateCompiledBook).mockResolvedValue(makeBook({ tray_name: "拾った断片" }));
    render(<CompilationEditPage />);
    await screen.findByDisplayValue("光と闇の書");

    fireEvent.change(screen.getByTestId("tray-name-input"), { target: { value: "拾った断片" } });

    await waitFor(
      () =>
        expect(updateCompiledBook).toHaveBeenCalledWith(
          "book1",
          expect.objectContaining({ tray_name: "拾った断片" }),
        ),
      { timeout: 3000 },
    );
    expect(await screen.findByText("保存しました")).toBeInTheDocument();
  });

  it("＋のパネルで章が増える", async () => {
    const second = { ...makeBook().chapters![0], id: "chap2", number: 2, title: "" };
    vi.mocked(createCompiledChapter).mockResolvedValue(second);
    vi.mocked(fetchCompiledBook)
      .mockResolvedValueOnce(makeBook())
      .mockResolvedValueOnce(makeBook({ chapters: [...makeBook().chapters!, second] }));
    render(<CompilationEditPage />);
    await screen.findByText("章を選択");

    fireEvent.click(screen.getByTestId("add-chapter-button"));

    await waitFor(() => expect(createCompiledChapter).toHaveBeenCalledWith("book1", {}));
    await waitFor(() => expect(screen.getAllByTestId("chapter-panel")).toHaveLength(2));
  });

  it("パネルをドラッグすると章の順番が入れ替わる", async () => {
    const second = { ...makeBook().chapters![0], id: "chap2", number: 2, title: "闇をわけた日" };
    vi.mocked(fetchCompiledBook).mockResolvedValue(makeBook({ chapters: [...makeBook().chapters!, second] }));
    vi.mocked(reorderCompiledChapters).mockResolvedValue(makeBook());
    render(<CompilationEditPage />);
    await screen.findByText("章を選択");

    const panels = screen.getAllByTestId("chapter-panel");
    const dataTransfer = makeDataTransfer();
    fireEvent.dragStart(panels[1], { dataTransfer });
    fireEvent.dragOver(panels[0], { dataTransfer });
    fireEvent.drop(panels[0], { dataTransfer });

    await waitFor(() => expect(reorderCompiledChapters).toHaveBeenCalledWith("book1", ["chap2", "chap1"]));
  });

  it("編纂書そのものを、モーダルで確認してから消せる", async () => {
    vi.mocked(deleteCompiledBook).mockResolvedValue(undefined);
    render(<CompilationEditPage />);
    await screen.findByText("章を選択");

    fireEvent.click(screen.getByTestId("delete-book"));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent("「光と闇の書」を消しますか？");
    fireEvent.click(screen.getByRole("button", { name: "編纂書を消す" }));

    await waitFor(() => expect(deleteCompiledBook).toHaveBeenCalledWith("book1"));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/compilations"));
  });

  it("読み込みに失敗しても画面が壊れない", async () => {
    vi.mocked(fetchCompiledBook).mockRejectedValue(new Error("boom"));
    render(<CompilationEditPage />);

    expect(await screen.findByText("編纂書を読み込めませんでした。")).toBeInTheDocument();
  });
});
